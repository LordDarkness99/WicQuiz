"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import type { QuestionFormData } from "../domain/types";
import type { QuestionType } from "@/shared/domain/types";

const questionTypeIcons: Record<QuestionType, string> = {
  multiple_choice: "quiz",
  true_false: "check_circle",
  image_question: "image",
  slider: "linear_scale",
  type_in: "keyboard",
  video_question: "videocam",
  audio_question: "music_note",
};

function GripVertical() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="5.5" cy="2.5" r="1.5" />
      <circle cx="10.5" cy="2.5" r="1.5" />
      <circle cx="5.5" cy="8" r="1.5" />
      <circle cx="10.5" cy="8" r="1.5" />
      <circle cx="5.5" cy="13.5" r="1.5" />
      <circle cx="10.5" cy="13.5" r="1.5" />
    </svg>
  );
}

interface SortableQuestionCardProps {
  id: string;
  question: QuestionFormData;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function SortableQuestionCard({
  id,
  question: q,
  index: idx,
  isSelected,
  onClick,
}: SortableQuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      onClick={onClick}
      className={`p-3 rounded-xl flex gap-2 group cursor-pointer transition-all ${
        isDragging ? "shadow-lg scale-[1.02]" : ""
      } ${
        isSelected
          ? "bg-surface-container-lowest shadow-sm border-l-4 border-primary"
          : q.is_joker
          ? "hover:bg-surface-container relative overflow-hidden"
          : "hover:bg-surface-container"
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-outline opacity-0 group-hover:opacity-100 transition-opacity flex items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical />
      </div>

      {q.is_joker && !isSelected && (
        <div className="absolute right-0 top-0 bg-tertiary-fixed-dim/20 w-12 h-12 -mr-6 -mt-6 rotate-45" />
      )}
      <div
        className={`text-[10px] font-bold mt-1 ${
          isSelected ? "text-primary/40" : "text-outline"
        }`}
      >
        {String(idx + 1).padStart(2, "0")}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm line-clamp-1 ${
            isSelected
              ? "font-bold text-primary-container"
              : "font-semibold text-on-surface-variant"
          }`}
        >
          {q.question_text || "Untitled question..."}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {q.is_joker ? (
            <>
              <span
                className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span className="text-[10px] font-bold bg-tertiary-fixed/30 px-2 py-0.5 rounded-full text-on-tertiary-fixed-variant tracking-tighter">
                JOKER
              </span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[14px] text-outline">
                {questionTypeIcons[q.type]}
              </span>
              <span className="text-[10px] font-bold bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant tracking-tighter">
                {q.time_limit}s
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
