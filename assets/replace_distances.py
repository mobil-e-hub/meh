from geopy import distance


# APIs
# --> Google Distance Matrix --> hard limit for free users / free credit 300$ for the users ?!?
# --> Distance.to => no clear info on pricing...

# OSM based ones --> https://openrouteservice.org/services/???demalexseinmac


key = 5b3ce3597851110001cf624873c91b921870496a8a06924ca3131d14

dummy_place_1 = (49.40279, 8.68937)
dummy_place_2 = (49.40297, 8.68862)
# Beeline distance with Geopy approximation
print(distance.distance(dummy_place_1, dummy_place_2).meters)


ors_key = 5b3ce3597851110001cf624873c91b921870496a8a06924ca3131d14


# iterate over edges:
# get for start & end hubs the long lat values
# --> retrieve beeline distance




# Open questions:
#- geht car überhaupt bei hubs die nicht an Straße liegen??  --> depends on API