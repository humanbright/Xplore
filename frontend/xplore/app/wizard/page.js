'use client'
import {useState, useEffect} from 'react'
import Cities from './cities'
import Attractions from './Attractions'
import MapPage from './MapPage'
import {useFirestore} from 'reactfire'
import {useUser} from '@clerk/nextjs'
import {doc, getDoc} from 'firebase/firestore'
import {useSearchParams} from 'next/navigation'
import LoadingPage from '../loading'

export default function Wizard() {
  const [mode, setMode] = useState(0)
  const [cities, setCities] = useState([])
  const [citiesObjects, setCitiesObjects] = useState([]) // [ {name: 'city', lat: 0, lng: 0}, ... ]
  const [preferences, setPreferences] = useState('')
  const [attractions, setAttractions] = useState([])
  const [selectedAttractions, setSelectedAttractions] = useState([])
  const [routes, setRoutes] = useState([])

  const [loading, setLoading] = useState(false)

  const firestore = useFirestore()
  const searchParams = useSearchParams()
  const routeName = searchParams.get('route') // Retrieve the 'route' query parameter
  const {user} = useUser()

  useEffect(() => {
    if (!user) {
      return
    }
    const fetchRouteData = async () => {
      if (routeName) {
        const userDocRef = doc(firestore, 'users', user.id)
        const docSnapshot = await getDoc(userDocRef)
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          if (data[routeName]) {
            setRoutes([JSON.parse(data[routeName])]) // Parse the stringified route data
            setMode(2) // Set mode to 2 to display the MapPage
          } else {
            console.log(`No route named ${routeName} found.`)
          }
        } else {
          console.log('No such document!')
        }
      }
    }

    fetchRouteData().catch(console.error)
  }, [routeName, firestore, user])

  const citiesSubmit = () => {
    // Need to just get the name of cities into a list
    setLoading(true)
    const cityNames = cities.map((city) => city.name)
    fetch('https://api.art3m1s.me/xplore/attractions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cities: cityNames,
        preferences: preferences,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        setAttractions(data)
        return fetch('https://api.art3m1s.me/xplore/geocode-multiple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({cities: cityNames}),
        })
      })
      .then((response) => response.json())
      .then((geocodeData) => {
        // Update citiesObjects with the geocode information
        setCitiesObjects(geocodeData)
        setLoading(false)
        setMode(1)
      })
      .catch((error) => {
        console.error('Error:', error)
      })
  }

  const submitAttractions = () => {
    // Ensure citiesObjects has at least 2 elements for start and end
    // attractions
    if (citiesObjects.length < 2) {
      console.error('Not enough cities to generate start and end attractions.')
      return
    }

    // Create startAttractions and endAttractions arrays
    const startAttractions = citiesObjects.slice(0, -1) // All except the last
    const endAttractions = citiesObjects.slice(1) // All except the first

    // Combine selectedAttractions and citiesObjects for the places array
    const places = [...citiesObjects, ...selectedAttractions].map((place) => ({
      name: place.name,
      lat: place.lat,
      lon: place.lng || place.lon, // Use lng or lon depending on the object structure
    }))

    // Prepare the payload for the POST request
    const payload = {
      places,
      initial_pop_size: 100,
      start_attractions: startAttractions.map((attr) => attr.name),
      end_attractions: endAttractions.map((attr) => attr.name),
      final_path_size: 5,
      generations: 50,
      initial_mutation_rate: 0.2,
      minimum_mutation_rate: 0.01,
    }

    // Make the POST request to the /generate-route/ endpoint
    fetch('https://api.art3m1s.me/xplore/generate-route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        return response.json()
      })
      .then((routeData) => {
        // Replace the names in routeData with the corresponding place objects
        const updatedRoutes = routeData.map((dayRoutes) =>
          dayRoutes.map((route) =>
            route.map((placeName) => {
              const placeObject = places.find((p) => p.name === placeName)
              return placeObject || placeName // If a place is not found, keep the original name
            }),
          ),
        )
        setRoutes(updatedRoutes) // Update the state with the replaced values
        setMode(2) // Change the mode to 2
      })
      .catch((error) => {
        console.error('Error:', error)
      })
  }

  if (loading) {
    return <LoadingPage />
  }

  if (mode === 2) {
    return <MapPage routePlans={routes} />
  }

  if (mode === 1) {
    return (
      <Attractions
        attractions={attractions}
        selectedAttractions={selectedAttractions}
        setSelectedAttractions={setSelectedAttractions}
        submitAttractions={submitAttractions}
      />
    )
  }

  return (
    <Cities
      cities={cities}
      setCities={setCities}
      preferences={preferences}
      setPreferences={setPreferences}
      continueFunction={citiesSubmit}
    />
  )
}
