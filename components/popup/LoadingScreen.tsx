import React from "react"

export const LoadingScreen = () => {
  return (
    <div className="p-4 bg-white shadow-lg w-[620px] border border-gray-200 flex flex-col items-center justify-center h-96">
      <div className="w-16 h-16 border-4 border-gray-300 border-t-[#ff9900] rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-medium text-gray-700">Loading...</h2>
      <p className="text-gray-500 mt-2">Checking authentication status</p>
    </div>
  )
}
