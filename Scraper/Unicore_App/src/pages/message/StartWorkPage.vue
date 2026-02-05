<template>
  <q-page class="bot-tab-page">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat round dense icon="arrow_back" @click="goBack" />
        <q-toolbar-title>Dashboard</q-toolbar-title>
        <q-btn flat round dense icon="logout" color="negative" @click="logoutUser" />
      </q-toolbar>

      <q-tabs
        v-model="activeTab"
        dense
        class="bg-white text-primary"
        active-color="primary"
        indicator-color="primary"
        align="justify"
      >
        <q-tab name="group" label="Group Message" />
        <q-tab name="bot" label="Bot" />
      </q-tabs>
    </q-header>

    <q-tab-panels v-model="activeTab" animated class="bg-grey-1">
      <q-tab-panel name="group">
        <div class="q-pa-md text-center text-grey-7">
          <q-icon name="chat" size="50px" class="q-mb-md" />
          <p>Group Message functionality coming soon...</p>
        </div>
      </q-tab-panel>

      <q-tab-panel name="bot" class="q-pa-none">
        <q-infinite-scroll @load="onLoadMore" reverse class="chat-container q-pa-md">
          <template v-slot:loading>
            <div class="row justify-center q-my-md">
              <q-spinner-dots color="primary" size="40px" />
            </div>
          </template>

          <div v-for="msg in messages" :key="msg.id" class="full-width column">
            <div v-if="msg.type === 'user'" class="user-msg-bubble q-pa-sm q-mb-md shadow-1">
              {{ msg.text }}
            </div>

            <div v-else :class="['bot-msg-bubble q-pa-md q-mb-md shadow-1', msg.type === 'assigned' ? 'bg-green-1' : 'bg-white']">

              <div v-if="msg.type === 'bot'" class="bot-message text-body2">

                <!-- Full bot message -->
                <div>{{ msg.text }}</div>

                <!-- OTP copy button -->
                <q-chip
                  v-if="extractOtp(msg.text)"
                  clickable
                  color="primary"
                  text-color="white"
                  class="q-mt-xs"
                  @click="copyOtp(extractOtp(msg.text))"
                >
                  📋 Copy code: {{ extractOtp(msg.text) }}
                </q-chip>

              </div>


              <div v-if="msg.type === 'assigned'">
                <div class="text-weight-bold q-mb-xs text-primary">✅ Number Assigned!</div>
                <div class="text-caption text-grey-7 q-mb-sm italic">Tap a number to copy</div>
                <div class="q-mb-sm">🌍 <b>Country:</b> {{ msg.data.country_name }}</div>

                <div class="copy-box q-mb-sm" @click="handleCopy(msg.data.number)">
                  <div class="text-grey-7 text-caption">With Country Code:</div>
                  <div class="row items-center justify-between no-wrap">
                    <span class="text-subtitle2 text-weight-bolder">{{ msg.data.number }}</span>
                    <q-icon name="content_copy" color="primary" size="xs" />
                  </div>
                </div>

                <div class="copy-box" @click="handleCopy(msg.data.local_number)">
                  <div class="text-grey-7 text-caption">Without Country Code:</div>
                  <div class="row items-center justify-between no-wrap">
                    <span class="text-subtitle2 text-weight-bolder">{{ msg.data.local_number }}</span>
                    <q-icon name="content_copy" color="primary" size="xs" />
                  </div>
                </div>
                <div class="q-mt-md text-caption text-grey-8 italic text-center">⏱ Listening for SMS...</div>
              </div>

              <div v-if="msg.data?.countries" class="q-mt-md column">
                <div class="text-caption q-mb-xs text-weight-bold text-grey-7">Select a country:</div>
                <q-btn
                  v-for="country in msg.data.countries"
                  :key="country.value"
                  unelevated outline no-caps color="primary"
                  class="q-mb-sm full-width bg-white"
                  :label="country.label"
                  @click="selectCountry(country, msg.id)"
                />
              </div>

              <q-btn
                v-if="msg.type === 'assigned' && !msg.data?.blocked"
                label="Block Number"
                color="negative"
                dense flat icon="block"
                class="q-mt-md full-width"
                @click="blockNumber(msg.id, msg.data.number)"
              />
              <q-badge v-else-if="msg.data?.blocked" color="negative" label="Blocked" class="q-mt-sm" />
            </div>
          </div>
        </q-infinite-scroll>

        <div class="fixed-bottom bg-white q-pa-md border-top shadow-up-1">
          <q-btn
            label="Get Number"
            color="primary"
            class="full-width text-weight-bold"
            size="lg"
            @click="sendGetNumber"
            :loading="loadingNumber"
            unelevated
          />
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { supabase } from 'boot/supabase'
import { useAuthStore } from 'stores/auth'
import { useRouter } from 'vue-router'
import { useQuasar, copyToClipboard } from 'quasar'

const auth = useAuthStore()
const router = useRouter()
const $q = useQuasar()

const activeTab = ref('bot')
const messages = ref([])
const loadingNumber = ref(false)
const countryList = ref([])

const PAGE_SIZE = 15
let oldestTimestamp = null

const scrollToBottom = (behavior = 'smooth') => {
  nextTick(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior })
    const panel = document.querySelector('.q-tab-panel.q-pa-none')
    if (panel) { panel.scrollTop = panel.scrollHeight }
  })
}


let botSubscription = null

const subscribeToBotMessages = () => {
  if (botSubscription) supabase.removeChannel(botSubscription)

  botSubscription = supabase
    .channel('bot-messages-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bot_messages',
        filter: `user_id=eq.${auth.user.id}`
      },
      (payload) => {
        // Prevent duplicates
        const exists = messages.value.find(m => m.id === payload.new.id)
        if (!exists) {
          messages.value.push(payload.new)
          scrollToBottom()
        }
      }
    )
    .subscribe()
}



watch(activeTab, async (newTab) => {
  if (newTab === 'bot' || newTab === 'group') {
    messages.value = []
    oldestTimestamp = null
    await loadInitialMessages()
    setTimeout(() => scrollToBottom('instant'), 350)
  }
})

const handleCopy = (text) => {
  copyToClipboard(text).then(() => {
    $q.notify({ message: 'Copied!', color: 'positive', icon: 'check', timeout: 800, position: 'center' })
  })
}

const loadCountries = async () => {
  const { data } = await supabase.from('numbers').select('country_name, country_code').order('country_name', { ascending: true })
  if (data) {
    const seen = new Set()
    countryList.value = data
      .filter(c => !seen.has(c.country_name) && seen.add(c.country_name))
      .map(c => ({ label: `${c.country_name} (${c.country_code})`, value: c.country_name }))
  }
}

const loadInitialMessages = async () => {
  const { data, error } = await supabase
    .from('bot_messages')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (!error && data) {
    messages.value = data.reverse()
    if (data.length > 0) oldestTimestamp = data[0].created_at
    scrollToBottom('instant')
  }
}

const onLoadMore = async (index, done) => {
  if (!oldestTimestamp) return done()
  const { data, error } = await supabase
    .from('bot_messages')
    .select('*')
    .eq('user_id', auth.user.id)
    .lt('created_at', oldestTimestamp)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (!error && data && data.length > 0) {
    oldestTimestamp = data[data.length - 1].created_at
    messages.value = [...data.reverse(), ...messages.value]
    done()
  } else {
    done(true)
  }
}

const sendGetNumber = async () => {
  loadingNumber.value = true
  try {
    // Insert user message
    await supabase.from('bot_messages').insert([{
      user_id: auth.user.id,
      type: 'user',
      text: 'Get Number'
    }])

    // Insert bot reply message
    await supabase.from('bot_messages').insert([{
      user_id: auth.user.id,
      type: 'bot',
      text: 'Select a country:',
      data: { countries: countryList.value }
    }])

    // No local push here — Realtime subscription will add them
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message })
  } finally {
    loadingNumber.value = false
  }
}


const copyOtp = async (otp) => {
  try {
    await copyToClipboard(otp)
    $q.notify({
      type: 'positive',
      message: `Code ${otp} copied`,
      position: 'top'
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Failed to copy',
      position: 'top'
    })
  }
}


const extractOtp = (text) => {
  if (!text) return null
  const match = text.match(/\b\d{4,8}\b/) // matches 4–8 digit OTP
  return match ? match[0] : null
}



const selectCountry = async (country, msgId) => {
  const tempId = Date.now()
  messages.value.push({ id: tempId, type: 'bot', text: `<em>Searching for ${country.label}...</em>`, data: {} })
  scrollToBottom()

  try {
    const { data, error } = await supabase.rpc('assign_number', { p_user: auth.user.id, p_country: country.value })
    if (error || data.error) throw new Error(error?.message || data.message)

    // FIX STARTS HERE
    const fullNumber = data.country_code + data.number // Combine code + local number

    const assignedMsg = {
      user_id: auth.user.id,
      type: 'assigned',
      data: {
        number: fullNumber,            // Now includes the country code (e.g., 2290140751787)
        local_number: data.number,     // The original local number (e.g., 0140751787)
        country_name: data.country_name,
        country_code: data.country_code,
        blocked: false
      }
    }
    // FIX ENDS HERE

    const { data: saved } = await supabase.from('bot_messages').insert([assignedMsg]).select().single()

    const idx = messages.value.findIndex(m => m.id === tempId)
    if (idx !== -1) messages.value[idx] = saved
    scrollToBottom()
  } catch (err) {
    const idx = messages.value.findIndex(m => m.id === tempId)
    if (idx !== -1) {
       messages.value[idx] = {
         id: Date.now(),
         type: 'bot',
         text: `<span class="text-negative">Error: ${err.message}</span>`,
         data: {}
       }
    }
  }
}

const blockNumber = async (msgId, number) => {
  try {
    const { error } = await supabase.rpc('block_number', { p_user: auth.user.id, p_number: number })
    if (error) throw error
    const msg = messages.value.find(m => m.id === msgId)
    if (msg) msg.data.blocked = true
    $q.notify({ type: 'warning', message: 'Number blocked' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message })
  }
}

const goBack = () => router.back()
const logoutUser = async () => {
  await auth.logout()
  router.replace('/login')
}

onMounted(async () => {
  await loadCountries()
  await loadInitialMessages()
  subscribeToBotMessages()
})

onUnmounted(() => {
  if (botSubscription) supabase.removeChannel(botSubscription)
})
</script>

<style scoped>
.bot-tab-page {
  background-color: #f5f5f5;
  height: 100vh;
}
.chat-container {
  padding-bottom: 140px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 100%;
}
.user-msg-bubble {
  align-self: flex-end;
  background-color: var(--q-primary);
  color: white;
  max-width: 80%;
  border-radius: 15px 15px 0 15px;
}
.bot-msg-bubble {
  align-self: flex-start;
  max-width: 90%;
  border-radius: 15px 15px 15px 0;
  width: auto;
  min-width: 240px;
}
.copy-box {
  background: rgba(255, 255, 255, 0.7);
  border: 1px dashed var(--q-primary);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.copy-box:active {
  background: #fff;
  transform: scale(0.97);
}
.sms-card {
  border-left: 4px solid var(--q-positive);
  padding-left: 10px;
}
.otp-display {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 10px;
  border-radius: 8px;
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
  letter-spacing: 3px;
}
.border-top {
  border-top: 1px solid #e0e0e0;
}
.fixed-bottom {
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
.italic {
  font-style: italic;
}
</style>
