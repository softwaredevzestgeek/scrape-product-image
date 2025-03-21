import { useEffect, useState } from "react"

import "./style.css"

import { onAuthStateChanged, signOut, type User } from "firebase/auth"

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

  const handleSignOut = async () => {
    try {
      await signOut(firebaseAuth)
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div className="bg-white shadow-lg w-[620px] border border-gray-200">
      <div className="relative">
        <h1 className="text-2xl font-semibold text-gray-800 text-center p-4 border-b border-gray-100">
          🛒 Amazon Media Extractor
        </h1>
        {user && (
          <button
            onClick={handleSignOut}
            className="text-xs py-1 px-2 bg-gray-200 hover:bg-gray-300 rounded-md transition absolute right-2 top-2 ">
            Sign Out
          </button>
        )}
      </div>

      {user ? <MediaExtractor user={user} /> : <AuthScreen />}
    </div>
  )
}

export default IndexPopup
