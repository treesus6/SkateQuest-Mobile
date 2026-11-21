-- Correct the existing imported Oregon park, rather than creating a duplicate or
-- matching the unrelated Newport, Rhode Island spot by name.
-- City park inventory: https://cdd.newportoregon.gov/dept/par/parks.asp (Sam Moore Parkway).
-- Existing OSM park polygon center: https://www.openstreetmap.org/way/1080964135
begin;
do $$
declare v_spot public.skate_spots%rowtype;
begin
 select * into v_spot from public.skate_spots
 where latitude between 44.6408 and 44.642 and longitude between -124.0602 and -124.0588
 order by public.st_distance(public.st_makepoint(longitude,latitude)::public.geography,public.st_makepoint(-124.0595455,44.6413704)::public.geography) limit 1;
 if v_spot.id is null then raise exception 'Verified Newport Oregon spot missing; do not guess a partner link';end if;
 update public.skate_spots set name='Newport Skatepark (Sam Moore Parkway)',spot_type='park'
 where id=v_spot.id and name='Unnamed Skatepark';
 update public.map_sponsors set spot_id=v_spot.id,latitude=v_spot.latitude,longitude=v_spot.longitude+0.00035,
   city='Newport',state='OR',updated_at=now()
 where website_url='https://portaldimension.com' and category='clothing_brand';
end $$;
notify pgrst,'reload schema';
commit;
