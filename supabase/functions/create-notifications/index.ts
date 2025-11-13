import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NotificationEvent {
  event_type: "new_document" | "comment" | "like" | "announcement" | "suggestion_status_changed";
  title: string;
  message: string;
  link?: string;
  user_ids?: string[]; // If provided, notify specific users only
  exclude_user_id?: string; // Exclude this user (e.g., the author)
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationEvent = await req.json();
    console.log("Creating notifications for event:", payload.event_type);

    let targetUserIds: string[] = [];

    // Determine which users to notify
    if (payload.user_ids && payload.user_ids.length > 0) {
      // Specific users provided
      targetUserIds = payload.user_ids;
    } else {
      // Notify all users (except excluded one)
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id");

      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      targetUserIds = profiles?.map((p) => p.user_id) || [];
    }

    // Exclude specific user if provided (e.g., the author)
    if (payload.exclude_user_id) {
      targetUserIds = targetUserIds.filter((id) => id !== payload.exclude_user_id);
    }

    if (targetUserIds.length === 0) {
      console.log("No users to notify");
      return new Response(
        JSON.stringify({ success: true, notified_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notifications for all target users
    const notifications = targetUserIds.map((userId) => ({
      user_id: userId,
      type: payload.event_type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      read: false,
    }));

    const { data, error } = await supabase
      .from("notifications")
      .insert(notifications)
      .select();

    if (error) {
      throw new Error(`Failed to create notifications: ${error.message}`);
    }

    console.log(`Successfully created ${data.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified_count: data.length,
        notifications: data
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error in create-notifications function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
