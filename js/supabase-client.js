/**
 * Academix - Supabase Cloud Synchronization Client
 * Connects to Supabase Project: lwacsamezwymumwbuteh
 * Provides seamless multi-device persistence, real-time syncing & offline resilience
 */

(function () {
  const DEFAULT_URL = "https://lwacsamezwymumwbuteh.supabase.co";
  const DEFAULT_DOC_ID = "rebin_academic_state_v4";
  const STORAGE_KEY_URL = "academix_supabase_url";
  const STORAGE_KEY_ANON = "academix_supabase_anon_key";
  const STORAGE_KEY_AUTOSYNC = "academix_supabase_autosync";

  class SupabaseSyncManager {
    constructor() {
      this.url = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_URL;
      this.anonKey = localStorage.getItem(STORAGE_KEY_ANON) || "";
      this.autoSyncEnabled = localStorage.getItem(STORAGE_KEY_AUTOSYNC) !== "false";
      this.client = null;
      this.status = "unconfigured"; // unconfigured | connecting | connected | error | disabled
      this.lastSyncTime = null;
      this.lastError = null;
      this.listeners = [];
      this.realtimeChannel = null;

      this.init();
    }

    init() {
      if (!window.supabase) {
        console.warn("[Supabase] Supabase JS SDK not loaded yet.");
        this.status = "unconfigured";
        return;
      }

      if (!this.anonKey) {
        this.status = "unconfigured";
        return;
      }

      try {
        this.client = window.supabase.createClient(this.url, this.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        this.status = "connecting";
        this.testConnection();
      } catch (err) {
        console.error("[Supabase] Failed to initialize client:", err);
        this.status = "error";
        this.lastError = err.message;
        this.notify();
      }
    }

    configure(url, anonKey, autoSync = true) {
      this.url = (url || DEFAULT_URL).trim();
      this.anonKey = (anonKey || "").trim();
      this.autoSyncEnabled = !!autoSync;

      localStorage.setItem(STORAGE_KEY_URL, this.url);
      localStorage.setItem(STORAGE_KEY_ANON, this.anonKey);
      localStorage.setItem(STORAGE_KEY_AUTOSYNC, this.autoSyncEnabled ? "true" : "false");

      this.init();
      this.notify();
    }

    disconnect() {
      localStorage.removeItem(STORAGE_KEY_ANON);
      this.anonKey = "";
      this.client = null;
      this.status = "unconfigured";
      if (this.realtimeChannel) {
        this.realtimeChannel.unsubscribe();
        this.realtimeChannel = null;
      }
      this.notify();
    }

    async testConnection() {
      if (!this.client) {
        this.status = "unconfigured";
        this.notify();
        return false;
      }

      try {
        this.status = "connecting";
        this.notify();

        // Attempt a read on academix_state table
        const { data, error } = await this.client
          .from("academix_state")
          .select("id, updated_at")
          .limit(1);

        if (error) {
          // If table does not exist, hint user
          if (error.code === "42P01" || error.message.includes("relation \"public.academix_state\" does not exist")) {
            this.status = "table_missing";
            this.lastError = "Table 'academix_state' not found. Please run the schema SQL in Supabase SQL Editor.";
          } else {
            this.status = "error";
            this.lastError = error.message || "Connection failed";
          }
          console.warn("[Supabase] Test query warning:", error);
          this.notify();
          return false;
        }

        this.status = "connected";
        this.lastError = null;
        console.log("[Supabase] Successfully connected to project lwacsamezwymumwbuteh!");
        this.setupRealtime();
        this.notify();
        return true;
      } catch (err) {
        this.status = "error";
        this.lastError = err.message || "Network error";
        console.error("[Supabase] Connection exception:", err);
        this.notify();
        return false;
      }
    }

    setupRealtime() {
      if (!this.client || !this.autoSyncEnabled || this.realtimeChannel) return;

      try {
        this.realtimeChannel = this.client
          .channel("academix-state-changes")
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "academix_state" },
            (payload) => {
              if (payload && payload.new && payload.new.id === DEFAULT_DOC_ID) {
                console.log("[Supabase Realtime] Inbound state update from cloud:", payload.new.updated_at);
                if (window.Store && typeof window.Store.applyCloudState === "function") {
                  window.Store.applyCloudState(payload.new.state, payload.new.updated_at);
                }
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn("[Supabase Realtime] Subscription error:", e);
      }
    }

    async pushState(state) {
      if (!this.client || this.status === "unconfigured" || !this.autoSyncEnabled) {
        return { success: false, reason: "Supabase not configured or disabled" };
      }

      try {
        const payload = {
          id: DEFAULT_DOC_ID,
          user_id: (state.profile && state.profile.id) || "rebin",
          state: state,
          version: "v4",
          updated_at: new Date().toISOString()
        };

        const { data, error } = await this.client
          .from("academix_state")
          .upsert(payload, { onConflict: "id" });

        if (error) {
          console.error("[Supabase Push Error]", error);
          this.lastError = error.message;
          this.status = error.code === "42P01" ? "table_missing" : "error";
          this.notify();
          return { success: false, error };
        }

        this.status = "connected";
        this.lastSyncTime = new Date().toISOString();
        this.notify();
        return { success: true };
      } catch (err) {
        console.error("[Supabase Push Exception]", err);
        this.lastError = err.message;
        this.notify();
        return { success: false, error: err };
      }
    }

    async pullState() {
      if (!this.client || this.status === "unconfigured") {
        return { success: false, reason: "Supabase not configured" };
      }

      try {
        const { data, error } = await this.client
          .from("academix_state")
          .select("state, updated_at")
          .eq("id", DEFAULT_DOC_ID)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // Row not found yet - table is empty
            return { success: true, empty: true };
          }
          console.error("[Supabase Pull Error]", error);
          return { success: false, error };
        }

        if (data && data.state) {
          this.lastSyncTime = data.updated_at || new Date().toISOString();
          this.notify();
          return { success: true, state: data.state, updatedAt: data.updated_at };
        }

        return { success: true, empty: true };
      } catch (err) {
        console.error("[Supabase Pull Exception]", err);
        return { success: false, error: err };
      }
    }

    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }

    notify() {
      this.listeners.forEach(fn => {
        try { fn(this); } catch (e) { console.error(e); }
      });
    }
  }

  window.SupabaseSync = new SupabaseSyncManager();
})();

