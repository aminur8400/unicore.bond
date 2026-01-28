<template>
  <q-page class="flex flex-center">
    <q-card style="width: 350px">
      <q-card-section>
        <div class="text-h6">Register</div>
      </q-card-section>

      <q-card-section>
        <q-input v-model="email" label="Email" />
        <q-input v-model="password" label="Password" type="password" />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          label="Go to Login"
          color="primary"
          to="/login"
        />
        <q-btn
          label="Register"
          color="primary"
          :loading="auth.loading"
          @click="handleRegister"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from 'stores/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const auth = useAuthStore()
const router = useRouter()

async function handleRegister () {
  try {
    await auth.register(email.value, password.value)
    router.push('/dashboard')
  } catch (err) {
    alert(err.message)
  }
}
</script>
