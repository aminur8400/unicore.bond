<template>
  <q-page padding class="dashboard-page">

    <!-- Header with Back + Logout -->
    <q-header elevated>
      <q-toolbar>
        <q-btn flat round dense icon="arrow_back" @click="goBack" />
        <q-toolbar-title>Dashboard</q-toolbar-title>
        <q-btn flat round dense icon="logout" color="negative" @click="logoutUser" />
      </q-toolbar>
    </q-header>

    <!-- Loading spinner -->
    <div v-if="auth.loading || loadingInfo" class="text-center q-pa-md">
      <q-spinner size="50px" color="primary" />
    </div>

    <!-- Profile not loaded / pending -->
    <div v-else-if="!auth.profile">
      <q-banner class="bg-yellow text-black">
        Loading profile or your account is pending approval.
      </q-banner>
    </div>

    <!-- Main dashboard -->
    <div v-else class="q-mb-xl"> <!-- add bottom margin for buttons -->
      <!-- Welcome card -->
      <q-card class="q-pa-md q-mb-md">
        <q-card-section>
          <div class="text-h6">Hello, {{ auth.profile.username }}!</div>
          <div class="text-subtitle2 q-mt-xs">
            Role: {{ auth.profile.role }}
          </div>
        </q-card-section>
      </q-card>

      <!-- Stats card -->
      <q-card class="q-pa-md q-mb-md">
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-4 text-center">
              <div class="text-h7">Balance</div>
              <div class="text-h6 text-primary">{{ auth.profile.balance }} ৳</div>
            </div>
            <div class="col-4 text-center">
              <div class="text-h7">Total Messages</div>
              <div class="text-h6 text-secondary">{{ auth.profile.total_messages }}</div>
            </div>
            <div class="col-4 text-center">
              <div class="text-h7">Status</div>
              <div class="text-h6">
                {{ auth.profile.status === 'active' ? 'Active' : auth.profile.status }}
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Dynamic Info Section -->
      <q-card class="q-pa-md q-mb-md">
        <q-card-section>
          <div class="text-h6 q-mb-sm">Important Information</div>
          <div v-if="info">
            <div class="text-subtitle2 q-mb-xs">{{ info.title }}</div>
            <div class="text-body2">{{ info.content }}</div>
          </div>
          <div v-else>
            <div class="text-body2 text-grey">No information available</div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Bottom Buttons: Only for normal users -->
    <div
      v-if="auth.profile.role === 'user'"
      class="dashboard-buttons q-pa-md row q-col-gutter-sm fixed-bottom bg-white shadow-2"
    >
      <q-btn
        label="Start Work"
        color="primary"
        class="col"
        @click="startWork"
        unelevated
      />
      <q-btn
        label="User Panel"
        color="secondary"
        class="col"
        @click="openUserPanel"
        unelevated
      />
    </div>


  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from 'stores/auth'
import { supabase } from 'boot/supabase'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const $q = useQuasar()
const router = useRouter()

const info = ref(null)
const loadingInfo = ref(false)

// Fetch dynamic info from Supabase
const fetchInfo = async () => {
  loadingInfo.value = true
  const { data, error } = await supabase
    .from('dashboard_info')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()
  if (!error) info.value = data
  loadingInfo.value = false
}

// Logout function
const logoutUser = async () => {
  try {
    await auth.logout()
    $q.notify({ type: 'positive', message: 'Logged out successfully!' })
    router.replace('/login')
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message || 'Logout failed' })
  }
}

// Back button function
const goBack = () => {
  router.back()
}

// Bottom buttons
const startWork = () => {
  // navigate to start work page
  router.push('/start-work')
}

const openUserPanel = () => {
  // navigate to user panel page
  router.push('/user-panel')
}

onMounted(() => {
  fetchInfo()
})
</script>

<style scoped>
.dashboard-page {
  min-height: 100%;
}

/* give space at bottom so content is not hidden behind buttons */
.dashboard-page > .q-page__content {
  padding-bottom: 80px;
}

.q-card {
  border-radius: 12px;
}

.dashboard-buttons {
  bottom: 0;
  left: 0;
  right: 0;
}
</style>
