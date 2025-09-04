"use client";
import { FaPlus } from "react-icons/fa6";

interface ButtonAddAgendaItemProps {
  onAdd: () => void;
  setEditingMode: () => void;
}

const BtnAddAgendaItem: React.FC<ButtonAddAgendaItemProps> = ({ onAdd, setEditingMode }) => {
  const handleClick = () => {
    onAdd();
    setEditingMode();
  };

  return (
    <li className="relative flex items-center min-h-[2rem]">
      <button
        className="w-[95%] mb-3 mx-auto flex items-center justify-between px-1.5 py-1.5 cursor-pointer rounded-lg border border-gray-300 hover:scale-105 border-dashed transition-all duration-200 focus:outline-none"
        aria-label="Add an agenda item"
        title="Add an agenda item"
        onClick={handleClick}
        type="button"
      >
        {/* Simulated faded lines */}
        <div className="flex-1 flex flex-col gap-1 text-left">
          <div className="h-2 w-3/4 bg-gray-300 rounded opacity-60 mb-1"></div>
          <div className="h-2 w-1/2 bg-gray-300 rounded opacity-40"></div>
        </div>
        <FaPlus className="text-gray-400 mr-2" />
      </button>
    </li>
  );
};

export default BtnAddAgendaItem;
