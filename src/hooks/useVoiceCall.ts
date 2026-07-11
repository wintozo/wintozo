import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";

type CallState = "idle" | "calling" | "incoming" | "connected";

type SignalPayload = {
  type: "offer" | "answer" | "ice" | "reject" | "end";
  from: string;
  to: string;
  sdp?: any;
  candidate?: any;
};

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useVoiceCall(username: string) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [caller, setCaller] = useState<string>("");
  const [callee, setCallee] = useState<string>("");
  const [callDuration, setCallDuration] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<any>(null);
  const pendingOfferRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  const sendSignal = useCallback((to: string, payload: Omit<SignalPayload, "from" | "to">) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "signal",
      payload: { ...payload, from: username, to },
    });
  }, [username]);

  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallState("idle");
    setCaller("");
    setCallee("");
    setCallDuration(0);
    pendingOfferRef.current = null;
  }, []);

  const startCallTimer = useCallback(() => {
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Подписка на сигналы через Realtime broadcast
  useEffect(() => {
    if (!username) return;

    const channel = supabase.channel(`voice_call_${username}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "signal" }, (msg: any) => {
      const data = msg.payload as SignalPayload;
      if (data.to !== username) return;

      switch (data.type) {
        case "offer":
          pendingOfferRef.current = { sdp: data.sdp, from: data.from };
          setCaller(data.from);
          setCallState("incoming");
          break;

        case "answer":
          if (pcRef.current && data.sdp) {
            pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            setCallState("connected");
            startCallTimer();
          }
          break;

        case "ice":
          if (pcRef.current && data.candidate) {
            pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
          }
          break;

        case "reject":
        case "end":
          cleanupCall();
          break;
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      cleanupCall();
    };
  }, [username]);

  const startCall = useCallback(async (targetUsername: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal(targetUsername, { type: "ice", candidate: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {});
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setCallee(targetUsername);
      setCallState("calling");
      sendSignal(targetUsername, { type: "offer", sdp: offer });
    } catch (err) {
      console.error("Ошибка звонка:", err);
      alert("Нет доступа к микрофону");
      cleanupCall();
    }
  }, [sendSignal, cleanupCall]);

  const acceptCall = useCallback(async () => {
    try {
      const pending = pendingOfferRef.current;
      if (!pending) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal(pending.from, { type: "ice", candidate: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {});
      };

      await pc.setRemoteDescription(new RTCSessionDescription(pending.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal(pending.from, { type: "answer", sdp: answer });

      setCaller(pending.from);
      setCallState("connected");
      startCallTimer();
    } catch (err) {
      console.error("Ошибка принятия звонка:", err);
      cleanupCall();
    }
  }, [sendSignal, startCallTimer, cleanupCall]);

  const rejectCall = useCallback(() => {
    if (pendingOfferRef.current) {
      sendSignal(pendingOfferRef.current.from, { type: "reject" });
    }
    cleanupCall();
  }, [sendSignal, cleanupCall]);

  const endCall = useCallback(() => {
    if (callState === "connected" || callState === "calling") {
      const target = callee || caller;
      if (target) sendSignal(target, { type: "end" });
    }
    cleanupCall();
  }, [callState, callee, caller, sendSignal, cleanupCall]);

  return {
    callState,
    caller,
    callee,
    callDuration,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };
}
