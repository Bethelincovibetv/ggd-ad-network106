create policy "Admins insert slide-images"
on storage.objects for insert to authenticated
with check (bucket_id = 'slide-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update slide-images"
on storage.objects for update to authenticated
using (bucket_id = 'slide-images' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'slide-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins delete slide-images"
on storage.objects for delete to authenticated
using (bucket_id = 'slide-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins insert business-logos"
on storage.objects for insert to authenticated
with check (bucket_id = 'business-logos' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update business-logos"
on storage.objects for update to authenticated
using (bucket_id = 'business-logos' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'business-logos' and public.has_role(auth.uid(), 'admin'));