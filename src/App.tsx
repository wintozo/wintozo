import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AuthPage from "./components/AuthPage";
import SelectDevicePage from "./components/SelectDevicePage";
import ChatPage from "./components/ChatPage";
import MobileChatsPage from "./components/MobileChatsPage";
import MobileContactsPage from "./components/MobileContactsPage";
import MobileSettingsPage from "./components/MobileSettingsPage";
import MobileChatConversationPage from "./components/MobileChatConversationPage";
import MobileGroupChat from "./components/MobileGroupChat";
import MobileCreateGroup from "./components/MobileCreateGroup";
import MobileGroupsPage from "./components/MobileGroupsPage";
import MobileBattlePage from "./components/MobileBattlePage";
import SolnechnayaAuthPage from "./components/SolnechnayaAuthPage";
import SolnechnayaSelectPage from "./components/SolnechnayaSelectPage";
import SolnechnayaMobileChat from "./components/SolnechnayaMobileChat";
import SolnechnayaComputerChat from "./components/SolnechnayaComputerChat";

function ScrollToTop() {
  const pathname = useLocation().pathname;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

function RootRedirect() {
  const location = useLocation();
  const logged = localStorage.getItem("wintozo_username");
  
  // Не редиректить если это раздел Солнечной
  if (location.pathname.startsWith("/solnechnaya")) {
    const solnechnayaLogged = localStorage.getItem("solnechnaya_username");
    return <Navigate to={solnechnayaLogged ? "/solnechnaya/registration/select" : "/solnechnaya/registration"} replace />;
  }
  
  return <Navigate to={logged ? "/test/registration/select" : "/test/registration"} replace />;
}

function SolnechnayaRedirect() {
  const logged = localStorage.getItem("solnechnaya_username");
  return <Navigate to={logged ? "/solnechnaya/registration/select" : "/solnechnaya/registration"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* === Wintozo Test === */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/test/registration" element={<AuthPage />} />
        <Route path="/test/registration/select" element={<SelectDevicePage />} />
        <Route path="/pc/test/chat" element={<ChatPage />} />
        <Route path="/mobile/test/chat" element={<MobileChatsPage />} />
        <Route path="/mobile/test/chat/contacts" element={<MobileContactsPage />} />
        <Route path="/mobile/test/chat/groups" element={<MobileGroupsPage />} />
        <Route path="/mobile/test/chat/battle" element={<MobileBattlePage />} />
        <Route path="/mobile/test/chat/:username" element={<MobileChatConversationPage />} />
        <Route path="/mobile/test/chat/group/new" element={<MobileCreateGroup />} />
        <Route path="/mobile/test/chat/group/:groupId" element={<MobileGroupChat />} />
        <Route path="/pc/test/chat/group/:groupId" element={<MobileGroupChat />} />
        <Route path="/mobile/test/settings" element={<MobileSettingsPage />} />
        <Route path="/test/chat" element={<ChatPage />} />

        {/* === Деревня Солнечная (скрытый раздел) === */}
        <Route path="/solnechnaya" element={<SolnechnayaRedirect />} />
        <Route path="/solnechnaya/registration" element={<SolnechnayaAuthPage />} />
        <Route path="/solnechnaya/registration/select" element={<SolnechnayaSelectPage />} />
        <Route path="/solnechnaya/mobile/chat" element={<SolnechnayaMobileChat />} />
        <Route path="wintozo/chat/test/solnechnaya/computer/chat" element={<SolnechnayaComputerChat />} />

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
