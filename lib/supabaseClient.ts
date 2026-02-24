import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://czztgyegitcusdwogumh.supabase.co';
const supabaseKey = 'sb_publishable_UyqDuXyBb7ORssioM2JDXg_QAeygAS3';

export const supabase = createClient(supabaseUrl, supabaseKey);