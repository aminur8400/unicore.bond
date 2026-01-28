import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dbpbeuyrvsagptqwllrr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicGJldXlydnNhZ3B0cXdsbHJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4MzQzMCwiZXhwIjoyMDg0MDU5NDMwfQ.FulpG5B-IyXdCV_dULVrPFFeQgFFTMdPcunTjuQ6CE0'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
