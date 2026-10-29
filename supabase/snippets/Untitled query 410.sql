alter table notes enable row level security;
create policy "Allow public read access" on notes
for select
using (true);