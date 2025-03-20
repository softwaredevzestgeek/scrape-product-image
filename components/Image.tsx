import { useEffect, useState } from "react"

interface ImageComponentProps {
  src: string
  alt: string
  className?: string
  onLoad?: () => void
  onError?: (error: Error) => void
}

export const Image: React.FC<ImageComponentProps> = ({
  src,
  alt,
  className = "",
  onLoad,
  onError
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchImage = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch the image as a blob
        const response = await fetch(src, {
          mode: "cors", // Try with CORS
          credentials: "omit" // Don't send cookies
        })

        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.status} ${response.statusText}`
          )
        }

        const imageBlob = await response.blob()
        const objectUrl = URL.createObjectURL(imageBlob)

        setImageSrc(objectUrl)
        setLoading(false)
        if (onLoad) onLoad()
      } catch (err) {
        console.error("Error loading image:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
        if (onError)
          onError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    fetchImage()

    // Clean up the object URL when the component unmounts or src changes
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [src, onLoad, onError])

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-pulse bg-gray-200 rounded-lg w-full h-full min-h-[100px]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-red-500 text-center text-xs p-2">
          <span className="block">❌</span>
          Failed to load image
        </div>
      </div>
    )
  }

  return <img src={imageSrc || ""} alt={alt} className={className} />
}
