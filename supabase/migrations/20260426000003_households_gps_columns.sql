-- GPS capture columns for households
alter table households
  add column if not exists latitude  numeric(9,6),
  add column if not exists longitude numeric(9,6),
  add column if not exists location_accuracy_m int,
  add column if not exists location_source text
    check (location_source in ('gps','manual','pin_placed','skipped'));
