import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import MessengerUsernamePage from "./components/MessengerUsernamePage";
import MessengerPasswordPage from "./components/MessengerPasswordPage";
import SelectDevicePage from "./components/SelectDevicePage";
import StyleSelectorPage from "./components/StyleSelectorPage";
import NewMobileChatPage from "./components/NewMobileChatPage";
import MobileChatsPage from "./components/MobileChatsPage";
import MobileContactsPage from "./components/MobileContactsPage";
import MobileSettingsPage from "./components/MobileSettingsPage";
import MobileChatConversationPage from "./components/MobileChatConversationPage";
import MobileGroupChat from "./components/MobileGroupChat";
import MobileCreateGroup from "./components/MobileCreateGroup";
import MobileGroupInvitePage from "./components/MobileGroupInvitePage";
import MobileGroupsPage from "./components/MobileGroupsPage";
import MobileBattlePage from "./components/MobileBattlePage";
import SolnechnayaAuthPage from "./components/SolnechnayaAuthPage";
import SolnechnayaSelectPage from "./components/SolnechnayaSelectPage";
import SolnechnayaMobileChat from "./components/SolnechnayaMobileChat";
import SolnechnayaComputerChat from "./components/SolnechnayaComputerChat";
import { CallProvider } from "./store/useCallStore";

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
  
  return <Navigate to={logged ? "/registration/select" : "/registration/messenger/username"} replace />;
}

function SolnechnayaRedirect() {
  const logged = localStorage.getItem("solnechnaya_username");
  return <Navigate to={logged ? "/solnechnaya/registration/select" : "/solnechnaya/registration"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <CallProvider>
        <ScrollToTop />
        <Routes>
          {/* === Wintozo — новые маршруты === */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/registration/messenger/username" element={<MessengerUsernamePage />} />
          <Route path="/registration/messenger/password" element={<MessengerPasswordPage />} />
          <Route path="/registration/select/style" element={<StyleSelectorPage />} />

          {/* === Wintozo — новые маршруты (новая тема) === */}
          <Route path="/mobile/new/chat" element={<NewMobileChatPage />} />
          <Route path="/mobile/new/chat/contacts" element={<NewMobileChatPage />} />
          <Route path="/mobile/new/chat/groups" element={<NewMobileChatPage />} />
          <Route path="/mobile/new/chat/battle" element={<NewMobileChatPage />} />
          <Route path="/mobile/new/chat/:username" element={<NewMobileChatPage />} />
          <Route path="/mobile/new/chat/group/new" element={<NewMobileChatPage />} />
          <Route path="/mobile/new/chat/group/:groupId" element={<NewMobileChatPage />} />
          <Route path="/mobile/new/settings" element={<NewMobileChatPage />} />

          {/* === Wintozo — основные маршруты (старая тема) === */}
          <Route path="/registration" element={<MessengerUsernamePage />} />
          <Route path="/registration/select" element={<SelectDevicePage />} />
          <Route path="/mobile/test/chat" element={<MobileChatsPage />} />
          <Route path="/mobile/test/chat/contacts" element={<MobileContactsPage />} />
          <Route path="/mobile/test/chat/groups" element={<MobileGroupsPage />} />
          <Route path="/mobile/test/chat/battle" element={<MobileBattlePage />} />
          <Route path="/mobile/test/chat/:username" element={<MobileChatConversationPage />} />
          <Route path="/mobile/test/chat/group/new" element={<MobileCreateGroup />} />
          <Route path="/mobile/test/chat/group/:groupId" element={<MobileGroupChat />} />
          <Route path="/chat/priglashenie/group/:groupId" element={<MobileGroupInvitePage />} />
          <Route path="/mobile/test/settings" element={<MobileSettingsPage />} />

          {/* === Деревня Солнечная (скрытый раздел) === */}
          <Route path="/solnechnaya" element={<SolnechnayaRedirect />} />
          <Route path="/solnechnaya/registration" element={<SolnechnayaAuthPage />} />
          <Route path="/solnechnaya/registration/select" element={<SolnechnayaSelectPage />} />
          <Route path="/solnechnaya/mobile/chat" element={<SolnechnayaMobileChat />} />
          <Route path="wintozo/chat/test/solnechnaya/computer/chat" element={<SolnechnayaComputerChat />} />

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </CallProvider>
    </BrowserRouter>
  );
}
