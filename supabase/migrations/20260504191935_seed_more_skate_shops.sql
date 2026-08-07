
INSERT INTO public.skate_shop_locations (shop_name, address, latitude, longitude, phone, city, state, description, google_place_id, rating) VALUES
-- Miami
('High Five Skate Shop', '315 Lincoln Rd, Miami Beach, FL 33139', 25.7908543, -80.1312355, '305-531-6112', 'Miami Beach', 'FL', 'Core skate shop on Lincoln Road in South Beach. Great staff and selection.', 'ChIJDWRMIZu02YgRTzM0rz-Kytw', 4.8),
('Greater Miami Skateshop', '13321 SW 42nd St, Miami, FL 33175', 25.7298281, -80.4102842, '786-499-5225', 'Miami', 'FL', '5-star owner-operated shop. Abe treats you like family. Best shop in south Miami.', 'ChIJq7dCZyC_2YgRbWrR72cnn0A', 5.0),
('Andrew Skateshop', '54 NE 40th St, Miami, FL 33137', 25.8132607, -80.1944153, '786-641-5146', 'Miami', 'FL', 'Downtown Miami core shop. Owned and run by real skaters. Free grip tape with decks.', 'ChIJd5lQHpy22YgRzXugQ5mihME', 4.1),
-- Atlanta
('Stratosphere Skateboards', '466 Moreland Ave NE, Atlanta, GA 30307', 33.7669791, -84.3494050, '404-521-3510', 'Atlanta', 'GA', 'L5P institution. Wide selection of gear, clothing, and skate memorabilia.', 'ChIJNcWx16gG9YgRV0Ba_C2JCZg', 3.9),
('Skate Plug', '3196 Dogwood Dr, Hapeville, GA 30354', 33.6670435, -84.4083834, '404-695-0000', 'Hapeville', 'GA', 'Owner Roman is a legend. Indoor mini ramp, huge deck selection. A true gem.', 'ChIJv7cv12v79IgRg4m8ONj_iyU', 4.7),
-- Phoenix
('Cowtown Skateboards', '5024 N Central Ave, Phoenix, AZ 85012', 33.509824, -112.0741575, '602-212-9687', 'Phoenix', 'AZ', 'Phoenix institution. Hundreds of decks, locally owned. Been around for decades.', 'ChIJGZ4jUMASK4cRbjyV6GZ6pWg', 4.8),
('Sidewalk Surfer', '2602 N Scottsdale Rd, Scottsdale, AZ 85257', 33.4769995, -111.9265726, '480-994-1017', 'Scottsdale', 'AZ', 'First class service. Best shop in Scottsdale for anything on wheels.', 'ChIJu2dA3N0LK4cR7cJe4VVYuN4', 4.8),
('Freedom Board Shop', '1316 S Gilbert Rd, Mesa, AZ 85204', 33.3908546, -111.7900789, '480-892-1707', 'Mesa', 'AZ', 'East Valley core shop. Family owned, great for beginners and veterans alike.', 'ChIJO_aI4ZSoK4cRb6p9EBLN1xA', 4.8),
-- Minneapolis
('Familia Skateboard Shop', '835 E Hennepin Ave, Minneapolis, MN 55414', 44.9919724, -93.2460764, '612-379-3080', 'Minneapolis', 'MN', 'Premier Minneapolis shop with indoor skatepark attached. Community focused.', 'ChIJz9ySOoAn9ocRKsmm-LGe5eQ', 4.7),
('Help Boardshop and Indoor Skatepark', '7399 Bush Lake Rd, Edina, MN 55439', 44.8684148, -93.359231, '952-217-4228', 'Edina', 'MN', 'Indoor skatepark + shop. 4.9 stars. Super welcoming atmosphere for all levels.', 'ChIJK0STfd0j9ocRKbFJq-0dFCU', 4.9),
-- Nashville
('Cecil''s Skate Shop', '1200 Porter Rd #3, Nashville, TN 37206', 36.1890889, -86.7293106, null, 'Nashville', 'TN', 'East Nashville gem. Build your own board. Community-first skate culture.', 'ChIJL1xyXxppZIgR3ZP-L8p5Y5w', 4.7),
('Asphalt Beach', '961 Woodland St, Nashville, TN 37206', 36.1769563, -86.7522368, '615-228-1105', 'Nashville', 'TN', 'Core Nashville shop. Knowledgeable staff, great vibes. Worth the drive.', 'ChIJE3MnrV9mZIgRbRdrF6aeTCo', 4.7),
-- Philadelphia
('Nocturnal Skateshop', '612 S 5th St, Philadelphia, PA 19147', 39.9414479, -75.1509057, '215-922-3177', 'Philadelphia', 'PA', 'South Philly core shop. Authentic vibe, staff who skate, fair prices.', 'ChIJ276GfJ7IxokRhzeH32dURMo', 4.6),
('Zembo Temple of Skate and Design', '2421 Frankford Ave, Philadelphia, PA 19125', 39.9820202, -75.1268202, '267-516-0487', 'Philadelphia', 'PA', 'Best skate shop in Philly per locals. Indoor section to test boards. 4.9 stars.', 'ChIJDfpv_ObJxokRzrWpUArVy48', 4.9),
-- Boston
('Orchard Skateshop', '8 Franklin St, Boston, MA 02134', 42.3558085, -71.1329154, '617-782-7777', 'Boston', 'MA', 'The Boston skate shop. Best selection in New England. Staff knows their stuff.', 'ChIJVecJ6cV544kRkY5AiTwqTOc', 4.6),
-- Las Vegas
('Pharmacy Boardshop Las Vegas', '1118 S Main St, Las Vegas, NV 89104', 36.1579973, -115.1537822, '725-204-8481', 'Las Vegas', 'NV', 'Downtown LV core shop. 4.9 stars. Your go-to local spot in Vegas.', 'ChIJIRMF78XDyIAR18ZNdVzpI6c', 4.9),
('Powder and Sun', '4555 S Fort Apache Rd, Las Vegas, NV 89147', 36.1064978, -115.2979731, '702-221-7669', 'Las Vegas', 'NV', 'West side Vegas shop. Knowledgeable crew, no upselling, honest advice.', 'ChIJwztWXbC4yIARGvcrc1kWL5E', 4.8)
ON CONFLICT DO NOTHING;


