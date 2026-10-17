import { timingSafeEqual } from "node:crypto";
import { createStorageAdminClient } from "@/app/lib/supabase/storage-admin";

const bucketName = "seller-verification-private";
const purgeableStatuses = ["draft", "action_required", "approved", "rejected", "suspended"];

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = cronSecret ? `Bearer ${cronSecret}` : "";
  if (
    !cronSecret ||
    Buffer.byteLength(authorization) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retentionDays = Number(
    process.env.SELLER_VERIFICATION_DOCUMENT_RETENTION_DAYS ?? "90",
  );
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    return Response.json(
      { error: "Seller verification retention configuration is invalid." },
      { status: 500 },
    );
  }
  const storageAdmin = createStorageAdminClient();
  if (!storageAdmin) {
    return Response.json(
      { error: "Server-side private storage is not configured." },
      { status: 500 },
    );
  }

  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: applications, error: applicationsError } = await storageAdmin
    .from("seller_verification_applications")
    .select("id, status")
    .in("status", purgeableStatuses)
    .is("documents_purged_at", null)
    .lt("updated_at", cutoff)
    .limit(500);
  if (applicationsError) {
    return Response.json(
      { error: "Unable to find expired verification records." },
      { status: 500 },
    );
  }
  if (!applications?.length) {
    return Response.json({ deletedDocuments: 0, scrubbedApplications: 0, removedApplications: 0 });
  }

  const applicationIds = applications.map((application) => application.id);
  const { data: documents, error: documentsError } = await storageAdmin
    .from("seller_verification_documents")
    .select("id, storage_path")
    .in("application_id", applicationIds)
    .limit(1000);
  if (documentsError) {
    return Response.json(
      { error: "Unable to load expired verification documents." },
      { status: 500 },
    );
  }
  if (documents?.length) {
    const paths = documents.map((document) => document.storage_path);
    for (let index = 0; index < paths.length; index += 100) {
      const { error: storageError } = await storageAdmin.storage
        .from(bucketName)
        .remove(paths.slice(index, index + 100));
      if (storageError) {
        return Response.json(
          { error: "Private verification files could not be deleted; metadata was retained." },
          { status: 500 },
        );
      }
    }

    const { error: metadataError } = await storageAdmin
      .from("seller_verification_documents")
      .delete()
      .in("id", documents.map((document) => document.id));
    if (metadataError) {
      return Response.json(
        { error: "Private files were deleted, but verification metadata cleanup failed." },
        { status: 500 },
      );
    }
    if (documents.length === 1000) {
      return Response.json({
        deletedDocuments: documents.length,
        moreDocumentsPending: true,
      });
    }
  }

  const removableIds = applications
    .filter((application) => ["draft", "action_required", "rejected"].includes(application.status))
    .map((application) => application.id);
  const scrubbedIds = applications
    .filter((application) => ["approved", "suspended"].includes(application.status))
    .map((application) => application.id);

  if (scrubbedIds.length) {
    const { error } = await storageAdmin
      .from("seller_verification_applications")
      .update({
        personal_data: {},
        business_data: {},
        operations_data: {},
        accepted_policy_versions: {},
        applicant_message: null,
        documents_purged_at: new Date().toISOString(),
      })
      .in("id", scrubbedIds);
    if (error) {
      return Response.json(
        { error: "Expired applicant identity data could not be scrubbed." },
        { status: 500 },
      );
    }
  }
  if (removableIds.length) {
    const { error } = await storageAdmin
      .from("seller_verification_applications")
      .delete()
      .in("id", removableIds);
    if (error) {
      return Response.json(
        { error: "Expired inactive applications could not be removed." },
        { status: 500 },
      );
    }
  }

  return Response.json({
    deletedDocuments: documents?.length ?? 0,
    scrubbedApplications: scrubbedIds.length,
    removedApplications: removableIds.length,
    inspectedApplications: applicationIds.length,
  });
}
