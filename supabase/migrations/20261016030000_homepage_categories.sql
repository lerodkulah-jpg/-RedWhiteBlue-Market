update public.categories
set name = 'Beauty & Health'
where slug = 'beauty'
  and name is distinct from 'Beauty & Health';

update public.categories
set name = 'Food & Groceries'
where slug = 'food-grocery'
  and name is distinct from 'Food & Groceries';

insert into public.categories (name, slug)
values
  ('Sports & Outdoors', 'sports-outdoors'),
  ('Jobs', 'jobs')
on conflict (slug) do update
set name = excluded.name
where public.categories.name is distinct from excluded.name;
