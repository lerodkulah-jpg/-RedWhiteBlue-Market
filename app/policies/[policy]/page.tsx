import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

const policyContent: Record<string, { title: string; paragraphs: string[] }> = {
  "seller-terms": {
    title: "Seller Terms and Conditions",
    paragraphs: [
      "Sellers must provide truthful account and store information, maintain accurate product descriptions and prices, and fulfill orders according to the delivery arrangements they publish.",
      "Seller access is subject to identity and store review. Approval may be withheld or suspended when information cannot be verified or marketplace rules are breached.",
      "The marketplace does not currently provide a verified checkout, payment-provider, or payout integration. Do not represent an off-platform payment as protected by RedWhiteBlue Market.",
    ],
  },
  privacy: {
    title: "Privacy and Identity-Data Processing Notice",
    paragraphs: [
      "Seller verification information is collected to review identity, store ownership, product sourcing, and marketplace safety. Verified account email is taken from the signed-in account; applicants do not create another account.",
      "Identity documents are stored in a private Supabase Storage bucket. Access is restricted to the applicant's own application metadata and authorized verification staff; staff document access uses short-lived signed links.",
      "Applicants are not asked to submit identity document numbers in their application. During administrator review, an authorized reviewer may enter the number read from the identity document into a protected server action. The raw number is used only to calculate a keyed HMAC fingerprint; it is not saved to the application or database.",
      "The keyed fingerprint is pseudonymous personal data used to prevent repeat seller free trials across accounts. It is retained while the marketplace operates the seller trial program, including after application details, identity documents, or the original seller account are deleted. It is protected by a server-only secret and is not available to buyers or sellers. Fingerprints cannot be matched if the secret is lost or changed; the operator must protect and back up that secret.",
      "Identity documents and application details follow the configured retention and deletion schedule. This notice is a product disclosure, not a legal compliance determination; obtain jurisdiction-specific legal review before production use.",
    ],
  },
  "prohibited-products": {
    title: "Prohibited Products Policy",
    paragraphs: [
      "Sellers must not list unlawful, stolen, counterfeit, deceptive, unsafe, or otherwise prohibited goods or services.",
      "Sellers are responsible for ensuring that product sourcing, import, distribution, and sale are lawful in the jurisdictions where they operate.",
      "This policy summary does not replace jurisdiction-specific legal review. Product restrictions must be confirmed for the seller's location and the marketplace's operations.",
    ],
  },
  refunds: {
    title: "Refund, Cancellation, and Dispute Rules",
    paragraphs: [
      "Sellers must accurately state item condition, availability, delivery terms, and any return or cancellation limitations before a buyer agrees to purchase.",
      "Sellers must respond promptly to buyer concerns and cooperate with marketplace review of disputes, cancellations, and suspected fraud.",
      "A marketplace checkout, refund ledger, or dispute-resolution payment integration is not currently configured. Do not claim that a payment or refund is protected or processed by this marketplace.",
    ],
  },
  "anti-fraud": {
    title: "Anti-Fraud and Anti-Counterfeit Requirements",
    paragraphs: [
      "Sellers must not impersonate another person or business, misrepresent product origin or authenticity, manipulate reviews, or use the marketplace to facilitate fraud.",
      "Provide evidence of authenticity for restricted or branded products when legally required. Report suspected account compromise or fraudulent activity to marketplace support.",
      "Verification does not guarantee the authenticity, safety, or legal compliance of every listing. Applicable policy and regulatory obligations require jurisdiction-specific review.",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(policyContent).map((policy) => ({ policy }));
}

export default function SellerPolicyPage({
  params,
}: {
  params: Promise<{ policy: string }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f3f7fd] p-8 text-sm text-slate-500">Loading policy…</main>}>
      <SellerPolicyContent params={params} />
    </Suspense>
  );
}

async function SellerPolicyContent({
  params,
}: {
  params: Promise<{ policy: string }>;
}) {
  const { policy } = await params;
  const content = policyContent[policy];
  if (!content) notFound();

  return (
    <main className="min-h-screen bg-[#f3f7fd] px-4 py-10 text-slate-900 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-3xl border border-[#dce8f8] bg-white p-6 shadow-sm sm:p-10">
        <Link href="/sell" className="text-sm font-bold text-[#0866f5] hover:underline">
          ← Back to seller verification
        </Link>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#f0142f]">
          RedWhiteBlue Market · Policy version 2026-10-18-v1
        </p>
        <h1 className="mt-2 text-3xl font-black text-[#08275a]">{content.title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          {content.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
          These initial platform rules are provided for seller onboarding and have not been represented as a legal compliance determination. The marketplace operator should obtain jurisdiction-specific legal review and adopt retention and deletion procedures before launch.
        </p>
      </article>
    </main>
  );
}
