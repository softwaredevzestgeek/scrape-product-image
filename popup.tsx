import { useEffect, useState } from "react"

import "./style.css"

import { onAuthStateChanged, type User } from "firebase/auth"

import { AuthScreen, LoadingScreen, MediaExtractor } from "~components/popup"
import { firebaseAuth } from "~firebase/config"

function IndexPopup() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="bg-white shadow-lg w-[620px] border border-gray-200">
      <h1 className="text-2xl font-semibold text-gray-800 text-center p-4 border-b border-gray-100">
        🛒 Amazon Media Extractor
      </h1>

      {user ? <MediaExtractor user={user} /> : <AuthScreen />}
    </div>
  )
}

export default IndexPopup
