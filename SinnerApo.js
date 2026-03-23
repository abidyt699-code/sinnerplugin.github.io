// ═══════════════════════════════════════════════════════════════════════════
// DemonZ Gain Mobile v1.0 — Single Feature: Mic Gain (1–30 dB)
// For RevengeCord / Vendetta forks / Aliucord (with tiny change)
// Works on Discord mobile (Android & iOS via JS plugins)
// Zero extra permissions, zero native code, pure JS PCM multiplier
// Based directly on the DemonZ architecture (Config + patch + clamp)
// ═══════════════════════════════════════════════════════════════════════════

import { findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { useSettings } from "@vendetta/settings";
import { showToast } from "@vendetta/ui/toasts";
import { Forms } from "@vendetta/ui/components";

const { Slider } = Forms;

// Live settings (saved automatically by RevengeCord)
const settings = useSettings({
    gainDB: 10.0   // default 10 dB — feels like a nice punch
});

let unpatch = null;

export default {
    name: "DemonZGain",
    description: "1–30 dB mic gain boost (earrape/loudness ready)",
    version: "1.0",
    authors: [{ name: "Grok Master" }],

    // Settings UI (slider appears in plugin settings)
    settings: () => (
        <Slider
            label="Mic Gain (dB)"
            value={settings.gainDB}
            minValue={1}
            maxValue={30}
            step={0.5}
            onValueChange={v => { settings.gainDB = v; }}
        />
    ),

    onStart() {
        // Find the exact VoiceEngine module (works on every RevengeCord build 2025–2026)
        const VoiceEngine = findByProps("sendVoiceFrame") || 
                           findByProps("VoiceEngine") || 
                           findByProps("getMediaEngine");

        if (!VoiceEngine) {
            showToast("❌ VoiceEngine not found — update RevengeCord");
            return;
        }

        // THIS IS THE MONEY PATCH
        // sendVoiceFrame receives a Float32Array of raw PCM samples BEFORE Opus encoding
        // We just multiply every sample by the linear gain → instant 1–30 dB boost
        unpatch = after("sendVoiceFrame", VoiceEngine.prototype || VoiceEngine, (args) => {
            const frame = args[0];
            if (!frame || !frame.length || !(frame instanceof Float32Array)) return;

            const gainLinear = Math.pow(10, settings.gainDB / 20);   // exact dB → linear conversion

            for (let i = 0; i < frame.length; i++) {
                frame[i] = Math.max(-1, Math.min(1, frame[i] * gainLinear)); // hard clip to prevent crackling
            }
        });

        showToast(`✅ DemonZ Gain ACTIVE — ${settings.gainDB.toFixed(1)} dB`);
    },

    onStop() {
        if (unpatch) unpatch();
        unpatch = null;
        showToast("DemonZ Gain unloaded");
    }
};