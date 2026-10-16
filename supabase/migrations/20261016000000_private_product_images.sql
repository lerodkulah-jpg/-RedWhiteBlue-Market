update storage.buckets
set public = false
where id = 'product-images';

drop policy if exists "Product image files are publicly readable"
  on storage.objects;
drop policy if exists "Product image files are readable by authorized viewers"
  on storage.objects;
drop policy if exists "Published product images are publicly readable"
  on storage.objects;
drop policy if exists "Sellers and administrators can read product images"
  on storage.objects;

create policy "Published product images are publicly readable"
  on storage.objects for select to anon
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.product_images as product_image
      join public.products as product
        on product.id = product_image.product_id
      where product_image.storage_path = storage.objects.name
        and product.id::text = (storage.foldername(storage.objects.name))[2]
        and product.moderation_status = 'published'
    )
  );

create policy "Sellers and administrators can read product images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.product_images as product_image
      join public.products as product
        on product.id = product_image.product_id
      where product_image.storage_path = storage.objects.name
        and product.id::text = (storage.foldername(storage.objects.name))[2]
        and (
          product.moderation_status = 'published'
          or product.seller_id = (select auth.uid())
          or (select public.is_administrator())
        )
    )
  );
