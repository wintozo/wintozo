import { Phone, PhoneOff } from "lucide-react";

type CallModalProps = {
  currentUsername: string;
  callTarget: string;
  onClose: () => void;
};

export default function CallModal({ currentUsername, callTarget, onClose }: CallModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Вызов</h3>
        <p className="text-gray-400 mb-6">{callTarget}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <PhoneOff className="w-5 h-5" />
            Завершить
          </button>
        </div>
      </div>
    </div>
  );
}
