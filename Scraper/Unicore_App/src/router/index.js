import { route } from 'quasar/wrappers'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'stores/auth'

export default route(function () {
  const Router = createRouter({
    history: createWebHashHistory(),
    routes
  })

  Router.beforeEach(async (to) => {
    const auth = useAuthStore()

    // 🔑 Wait until auth store is initialized
    await auth.initAuth()

    // -------------------------------
    // Guest-only pages (login/register)
    // -------------------------------
    if (to.meta.guestOnly) {
      if (auth.user && auth.profile?.status === 'active') {
        // Approved users cannot visit login/register
        return '/dashboard'
      }
      // Pending users or not logged in can stay
      return
    }

    // -------------------------------
    // Protected pages (dashboard)
    // -------------------------------
    if (to.meta.requiresAuth) {
      // Not logged in
      if (!auth.user) return '/login'

      // User logged in but not approved
      if (!auth.profile || auth.profile.status !== 'active') {
        return '/pending-approval'
      }
    }

    // no redirect needed
    return
  })

  return Router
})
