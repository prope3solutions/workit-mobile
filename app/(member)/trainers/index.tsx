import { useEffect } from 'react'
import { router } from 'expo-router'

export default function TrainersRedirect() {
  useEffect(() => {
    router.replace('/(member)/discover?tab=trainers')
  }, [])
  return null
}
