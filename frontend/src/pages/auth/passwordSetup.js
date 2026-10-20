export const readTokenFromHash = () => {
  const params = new URLSearchParams(window.location.hash.slice(1))
  return params.get('token') || ''
}

export const validatePasswordSetup = (password, confirmation) => {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (new TextEncoder().encode(password).length > 72)
    return 'Password must be at most 72 characters.'
  if (password !== confirmation) return 'Passwords do not match.'
  return ''
}
