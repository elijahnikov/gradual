import { cn } from "@gradual/ui";
import { Heading, headingVariants } from "@gradual/ui/heading";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const TRAILING_WHITESPACE_REGEX = /\s+$/;

interface TextShimmerProps {
  children: string;
  className?: string;
  duration?: number;
  spread?: number;
}

function TextShimmer({
  children,
  className,
  duration = 4,
  spread = 2,
}: TextShimmerProps) {
  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: 100% center;
          }
          100% {
            background-position: 0% center;
          }
        }
      `}</style>
      <span
        className={cn(
          "relative block bg-size-[250%_100%,auto] bg-clip-text text-transparent",
          "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--bg-base),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
          className
        )}
        style={
          {
            "--spread": `${dynamicSpread}px`,
            backgroundImage:
              "var(--bg), linear-gradient(var(--fg-subtle), var(--fg-subtle))",
            animation: `shimmer ${duration}s linear infinite`,
          } as React.CSSProperties
        }
      >
        {children}
      </span>
    </>
  );
}

export default function EditableTitle({
  title,
  updateCallback,
  loading = false,
}: {
  title: string;
  updateCallback: (title: string) => void;
  loading?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [displayTitle, setDisplayTitle] = useState(title);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const headingWidthRef = useRef<number | null>(null);

  const updateTextareaHeight = useCallback((textarea: HTMLTextAreaElement) => {
    const valueWithoutTrailing = textarea.value.replace(
      TRAILING_WHITESPACE_REGEX,
      ""
    );

    const targetWidth =
      headingWidthRef.current ??
      containerRef.current?.getBoundingClientRect().width ??
      null;

    if (targetWidth !== null) {
      textarea.style.width = `${targetWidth}px`;
      textarea.style.maxWidth = `${targetWidth}px`;
    }

    if (measureRef.current && targetWidth !== null) {
      measureRef.current.style.width = `${targetWidth}px`;
      measureRef.current.textContent = valueWithoutTrailing || " ";
      const measuredHeight = measureRef.current.getBoundingClientRect().height;
      textarea.style.height = `${measuredHeight}px`;
    } else {
      textarea.style.height = "auto";
      const newHeight = textarea.scrollHeight;
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    setEditValue(title);
    setDisplayTitle(title);
    headingWidthRef.current = null;
  }, [title]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
      updateTextareaHeight(textarea);

      const resizeObserver = new ResizeObserver(() => {
        if (textareaRef.current) {
          updateTextareaHeight(textareaRef.current);
        }
      });

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [isEditing, updateTextareaHeight]);

  useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      updateTextareaHeight(textareaRef.current);
    }
  }, [isEditing, updateTextareaHeight]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== displayTitle) {
      setDisplayTitle(trimmed);
      updateCallback(trimmed);
    }
    setIsEditing(false);
    headingWidthRef.current = null;
  }, [editValue, displayTitle, updateCallback]);

  const handleCancel = useCallback(() => {
    setEditValue(displayTitle);
    setIsEditing(false);
    headingWidthRef.current = null;
  }, [displayTitle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  const handleClick = useCallback(() => {
    if (headingRef.current) {
      headingWidthRef.current =
        headingRef.current.getBoundingClientRect().width;
    }
    setIsEditing(true);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setEditValue(newValue);
      updateTextareaHeight(e.target);
    },
    [updateTextareaHeight]
  );

  if (isEditing) {
    return (
      <div className="relative -mb-[6.5px] w-full" ref={containerRef}>
        <span
          className={cn(
            headingVariants({ level: "h1" }),
            "wrap-break-word invisible absolute whitespace-pre-wrap"
          )}
          ref={measureRef}
          style={{
            fontSize: "1.125rem",
            lineHeight: "1.75rem",
            fontWeight: "500",
            letterSpacing: "normal",
            maxWidth: "100%",
          }}
        >
          {editValue || " "}
        </span>
        <textarea
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={cn(
            headingVariants({ level: "h1" }),
            "relative m-0 resize-none overflow-hidden border-none bg-transparent p-0 outline-none"
          )}
          data-1p-ignore
          data-lpignore="true"
          onBlur={handleBlur}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          ref={textareaRef}
          spellCheck={false}
          style={{
            fontSize: "1.125rem",
            lineHeight: "1.75rem",
            fontWeight: "500",
            letterSpacing: "normal",
          }}
          value={editValue}
          wrap="soft"
        />
      </div>
    );
  }

  return (
    <div className="w-full" ref={containerRef}>
      <Heading
        className="wrap-break-word cursor-text select-none"
        onClick={handleClick}
        ref={headingRef}
      >
        {loading ? (
          <TextShimmer
            className={cn(headingVariants({ level: "h1" }), "wrap-break-word")}
          >
            {displayTitle}
          </TextShimmer>
        ) : (
          displayTitle
        )}
      </Heading>
    </div>
  );
}
