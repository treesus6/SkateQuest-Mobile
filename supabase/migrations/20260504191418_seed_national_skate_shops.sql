
INSERT INTO public.skate_shop_locations (shop_name, address, latitude, longitude, phone, website, city, state, description, google_place_id, rating) VALUES
-- Los Angeles
('LA Skate Co.', '5401 Santa Monica Blvd, Los Angeles, CA 90029', 34.0909684, -118.3073165, '323-467-5283', null, 'Los Angeles', 'CA', 'Core skate shop on Santa Monica Blvd. Great staff and selection.', 'ChIJudhSHsvAwoARXOKxhmMpSIM', 4.8),
('Non Factory', '108 San Pedro St, Los Angeles, CA 90012', 34.0500133, -118.2409990, '213-620-0314', null, 'Los Angeles', 'CA', 'Core shop in Little Tokyo with rare boards and Nike SB drops.', 'ChIJwbxOdkjGwoARohqH_L5z7xE', 4.1),
('Warning Skate Shop', '8228 S Central Ave, Los Angeles, CA 90001', 33.9639387, -118.2561939, '323-588-7638', null, 'Los Angeles', 'CA', 'South LA core shop. Fair prices and great service.', 'ChIJU2ERsaHJwoARdKP8fD-F3YY', 4.7),
-- New York
('Labor Skateboard Shop', '46 Canal St, New York, NY 10002', 40.7146389, -73.9916389, '646-351-6792', null, 'New York', 'NY', 'Legendary NYC core skate shop on Canal St. Best selection in the city.', 'ChIJyQKAqylawokR9aXh8WSxe9U', 4.7),
('Uncle Funkys Boards', '128 Charles St, New York, NY 10014', 40.7342046, -74.0073824, '646-895-9943', null, 'New York', 'NY', 'Basement shop in the West Village. Owner is super knowledgeable and community focused.', 'ChIJEVSHWetZwokRZSh9ZFJx7ic', 4.8),
('Upper West Skates', '2768 Broadway, New York, NY 10025', 40.801703, -73.9675744, '917-563-3760', null, 'New York', 'NY', 'Upper West Side shop with amazing customer service. Owner Chris is legendary.', 'ChIJ05ph-0L3wokRzlqbI-VMT1k', 4.9),
-- Chicago
('Uprise', '1820 N Milwaukee Ave, Chicago, IL 60647', 41.914469, -87.683976, '773-342-7763', null, 'Chicago', 'IL', 'Premier Chicago skate shop in Wicker Park. Best staff and selection in the city.', 'ChIJ_V-Px73SD4gR82VTz3yAhEs', 4.8),
('Citizen Skate Shop', '920 W Wilson Ave, Chicago, IL 60640', 41.9655659, -87.6533270, '773-420-9466', null, 'Chicago', 'IL', 'Community focused shop in Uptown. Steps away from a great skatepark.', 'ChIJeToy-NHTD4gRZYpCRuBZp_k', 4.7),
-- San Francisco
('Deluxe Skateshop', '2330 Mission St, San Francisco, CA 94110', 37.7597005, -122.4193554, '415-626-5588', null, 'San Francisco', 'CA', 'DLX — legendary SF skate shop in the Mission. Home of Deluxe Distribution brands.', 'ChIJQ6tEAqCAhYAR2GZTYHXRlV0', 4.8),
('FTC Skateboarding', '1632 Haight St, San Francisco, CA 94117', 37.76988, -122.4492263, '415-626-0663', null, 'San Francisco', 'CA', 'Legendary Haight St shop. Been around 25+ years. Classic SF core shop.', 'ChIJ202mBlOHhYARsP5t7gRFp64', 4.4),
-- Seattle
('35th North Skate Shop', '1100 E Pike St, Seattle, WA 98122', 47.614231, -122.3179637, '206-320-1252', null, 'Seattle', 'WA', 'Best skate shop in Washington. Been around 20+ years. Local artists on shop decks.', 'ChIJvb3XNcxqkFQRY9JR6i-J3Uk', 4.7),
('Black Market Skates', '8114 Aurora Ave N, Seattle, WA 98103', 47.6881268, -122.3442822, '206-930-8851', null, 'Seattle', 'WA', 'Core shop on Aurora. Friendly staff and great selection. Build your own board here.', 'ChIJ67j9D0kVkFQRb68Xd3d1xSA', 4.7),
-- Austin
('No-Comply Skateshop', '824A W 12th St, Austin, TX 78701', 30.2764585, -97.7494627, '512-804-0472', null, 'Austin', 'TX', 'Best skate shop in Austin. Super welcoming to all skill levels.', 'ChIJv_ZfN3O1RIYR4xRGOZ_SZKw', 4.8),
('Apparition Skateboards', '1906 Guadalupe St, Austin, TX 78705', 30.2824626, -97.7422623, '512-459-7827', null, 'Austin', 'TX', 'Underground ATX icon. Real skate shop culture.', 'ChIJh7UpYWvKRIYRRgQtWKJ-9d0', 4.7),
-- Denver
('303 Boards', '1338 E Colfax Ave, Denver, CO 80218', 39.7398832, -104.9700058, '303-860-1303', null, 'Denver', 'CO', 'Top rated shop in Denver. 4.9 stars, 665 reviews. Amazing staff.', 'ChIJuYvvzsx-bIcRnr78rLiJcLY', 4.9),
('Emage', '1620 Platte St, Denver, CO 80202', 39.7573893, -105.007869, '720-855-8297', null, 'Denver', 'CO', 'Premium Denver shop. FA, Hockey, Sci-Fi Fantasy, Vans, Nike. Plus a shop dog.', 'ChIJ23lm6ep4bIcRMn2F49Xsngk', 4.6)
ON CONFLICT DO NOTHING;


