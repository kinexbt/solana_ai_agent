import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import Image from 'next/image';

import { SavedPrompt } from '@prisma/client';
import { Attachment } from 'ai';
import { Image as ImageIcon, SendHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';

import { SavedPromptsMenu } from '@/components/saved-prompts-menu';
import { BorderBeam } from '@/components/ui/border-beam';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { uploadImage } from '@/lib/upload';
import { cn } from '@/lib/utils';
import {
  getSavedPrompts,
  setSavedPromptLastUsedAt,
} from '@/server/actions/saved-prompt';

interface ConversationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, attachments: Attachment[]) => Promise<void>;
  onChat?: boolean;
  savedPrompts: SavedPrompt[];
  setSavedPrompts: Dispatch<SetStateAction<SavedPrompt[]>>;
}

export const MAX_CHARS = 2000;

interface UploadingImage extends Attachment {
  localUrl: string;
  uploading: boolean;
}

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: UploadingImage;
  onRemove: () => void;
}) {
  return (
    <div className="group relative h-16 w-16 shrink-0">
      <Image
        src={attachment.localUrl}
        alt={attachment.name ?? 'Attached image'}
        fill
        className="rounded-lg border object-cover"
      />
      {attachment.uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 shadow-sm backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-background"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function ConversationInput({
  value,
  onChange,
  onSubmit,
  onChat = false,
  savedPrompts = [],
  setSavedPrompts = () => {},
}: ConversationInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<UploadingImage[]>([]);
  const [isFetchingSavedPrompts, setIsFetchingSavedPrompts] = useState(true);

  useEffect(() => {
    async function fetchSavedPrompts() {
      try {
        const res = await getSavedPrompts();
        const prompts = res?.data?.data || [];

        setSavedPrompts(prompts);
      } catch (err) {
        console.error(err);
      }

      setIsFetchingSavedPrompts(false);
    }

    fetchSavedPrompts();
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    const newAttachment: UploadingImage = {
      url: localUrl,
      name: file.name,
      contentType: file.type,
      localUrl,
      uploading: true,
    };

    setAttachments((prev) => [...prev, newAttachment]);

    try {
      const url = await uploadImage(file);
      if (!url) throw new Error('Failed to upload image');

      setAttachments((prev) =>
        prev.map((att) =>
          att.localUrl === localUrl ? { ...att, url, uploading: false } : att,
        ),
      );
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
      setAttachments((prev) => prev.filter((att) => att.localUrl !== localUrl));
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }, []);

  const removeAttachment = useCallback((localUrl: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((att) => att.localUrl === localUrl);
      if (attachment) {
        URL.revokeObjectURL(attachment.localUrl);
      }
      return prev.filter((att) => att.localUrl !== localUrl);
    });
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      await Promise.all(files.map(handleImageUpload));

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleImageUpload],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageFiles = items
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      await Promise.all(imageFiles.map(handleImageUpload));
    },
    [handleImageUpload],
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim() && attachments.length === 0) return;
    if (attachments.some((att) => att.uploading)) {
      toast.error('Please wait for images to finish uploading');
      return;
    }

    const currentAttachments = attachments.map(
      ({ url, name, contentType }) => ({
        url,
        name,
        contentType,
      }),
    );

    setAttachments([]);
    await onSubmit(value, currentAttachments);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_CHARS) {
      onChange(newValue);
      return;
    }
    toast.error('Maximum character limit reached');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    return () => {
      attachments.forEach((att) => {
        if (att.uploading) {
          URL.revokeObjectURL(att.localUrl);
        }
      });
    };
  }, [attachments]);

  async function updatePromptLastUsedAt(id: string) {
    try {
      const res = await setSavedPromptLastUsedAt({ id });
      if (!res?.data?.data) {
        throw new Error();
      }

      const { lastUsedAt } = res.data.data;

      setSavedPrompts((old) =>
        old.map((prompt) =>
          prompt.id !== id ? prompt : { ...prompt, lastUsedAt },
        ),
      );
    } catch (error) {
      console.error('Failed to update -lastUsedAt- for prompt:', { error });
    }
  }

  const filteredPrompts = value.startsWith('/')
    ? savedPrompts.filter((savedPrompt) =>
        savedPrompt.title.toLowerCase().includes(value.slice(1).toLowerCase()),
      )
    : savedPrompts;

  function handlePromptMenuClick(subtitle: string) {
    onChange(subtitle);
  }

  return (
    <div
      className={`relative ${!onChat ? 'duration-500 animate-in fade-in slide-in-from-bottom-4' : ''}`}
    >
      <div className="relative rounded-xl bg-muted">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {onChat && (
            <SavedPromptsMenu
              input={value}
              isFetchingSavedPrompts={onChat ? isFetchingSavedPrompts : false}
              savedPrompts={savedPrompts}
              filteredPrompts={filteredPrompts}
              onPromptClick={handlePromptMenuClick}
              updatePromptLastUsedAt={updatePromptLastUsedAt}
            />
          )}
          {attachments.length > 0 && (
            <div className="flex gap-2 overflow-x-auto rounded-t-xl bg-muted/50 p-3">
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.localUrl}
                  attachment={attachment}
                  onRemove={() => removeAttachment(attachment.localUrl)}
                />
              ))}
            </div>
          )}

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            maxLength={MAX_CHARS}
            placeholder={
              onChat ? 'Send a message...' : 'Start a new conversation...'
            }
            className={cn(
              'max-h-[350px] min-h-[110px] w-full resize-none overflow-y-scroll border-0 bg-transparent px-4 py-3 text-base focus-visible:ring-0',
              attachments.length > 0 ? 'rounded-t-none' : 'rounded-t-xl',
            )}
          />

          <div className="flex items-center justify-between border-t px-4 py-2">
            <div className="flex w-full flex-row items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Type / to search for saved prompts (e.g. /BNB Price...)
              </span>
              <span className="text-xs text-muted-foreground">
                {value.length}/{MAX_CHARS}
              </span>
            </div>

            <div className="flex">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>

              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={
                  (!value.trim() && attachments.length === 0) ||
                  attachments.some((att) => att.uploading)
                }
                className="group relative flex h-8 w-8 items-center justify-center rounded-lg 
                  transition-all duration-200 ease-in-out
                  hover:bg-primary hover:text-primary-foreground 
                  active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendHorizontal className="h-4 w-4 transition-transform duration-200 ease-out group-hover:scale-110" />
              </Button>
            </div>
          </div>
        </form>

        {!onChat && <BorderBeam size={250} duration={8} delay={9} />}
      </div>
    </div>
  );
}
