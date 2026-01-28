import { defineStore } from 'pinia'
import { supabase } from 'boot/supabase'

let authReadyPromise = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    profile: null,
    loading: false,
    initialized: false,
    loginError: null
  }),

  actions: {
    // 🔑 HARD INIT (used by router to restore session)
    async initAuth() {
      if (this.initialized) return

      if (!authReadyPromise) {
        authReadyPromise = (async () => {
          const { data } = await supabase.auth.getSession()

          if (data.session) {
            this.user = data.session.user
            await this.fetchProfile()
          } else {
            this.user = null
            this.profile = null
          }

          this.initialized = true
        })()
      }

      return authReadyPromise
    },

    // 🔑 Login
    async login(email, password) {
      this.loading = true
      this.loginError = null

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      this.loading = false

      if (error) {
        this.loginError = error.message
        throw error
      }

      this.user = data.user
      await this.fetchProfile()

      // ❌ Prevent login if user is not approved
      if (!this.profile || this.profile.status !== 'active') {
        this.user = null
        this.profile = null
        this.loginError = 'Your account is pending admin approval.'
        throw new Error(this.loginError)
      }
    },

    // 🔑 Register
    async register(email, password) {
      this.loading = true
      this.loginError = null

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      this.loading = false
      if (error) {
        this.loginError = error.message
        throw error
      }

      this.user = data.user

      // ✅ Create profile row immediately after registration
      if (this.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: this.user.id,
            username: email.split('@')[0], // optional default username
            balance: 0,
            total_messages: 0,
            status: 'pending', // admin approval
            role: 'user'
          }])

        if (profileError) {
          this.loginError = profileError.message
          throw profileError
        }

        await this.fetchProfile()
      }
    },

    // 🔑 Fetch profile for current user
    async fetchProfile() {
      if (!this.user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.user.id)
        .single()

      if (error) {
        this.profile = null
        return
      }

      this.profile = data
    },

    // 🔑 Logout
    async logout() {
      await supabase.auth.signOut()
      this.user = null
      this.profile = null
      this.initialized = true
      this.loginError = null
    }
  }
})
