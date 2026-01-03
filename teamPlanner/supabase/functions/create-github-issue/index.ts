import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Créer client Supabase pour récupérer la config
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer le token GitHub
    const { data: configData, error: configError } = await supabaseClient
      .from('app_config')
      .select('value')
      .eq('key', 'github_token')
      .single()

    if (configError || !configData) {
      return new Response(
        JSON.stringify({ success: false, error: 'GitHub token not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { issue_title, issue_body, issue_labels = ['bug-report', 'user-report'] } = await req.json()

    if (!issue_title || !issue_body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title and body are required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Créer l'issue GitHub
    const issueData = {
      title: issue_title,
      body: issue_body,
      labels: issue_labels
    }

    const response = await fetch('https://api.github.com/repos/OptiPlay-Agency/OptiPlay-Agency.github.io/issues', {
      method: 'POST',
      headers: {
        'Authorization': `token ${configData.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'OptiPlay-Manager'
      },
      body: JSON.stringify(issueData)
    })

    const result = await response.json()

    if (result.html_url) {
      return new Response(
        JSON.stringify({
          success: true,
          issue_url: result.html_url,
          issue_number: result.number
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create issue', 
          details: result 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})