import { AlertTriangle, Info, Loader2, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DataState, DataStatusKind } from '../types/astranovus';
import { DATA_STATE_LABEL, DATA_STATE_STYLE, STATUS_LABEL, STATUS_STYLE } from '../utils/mission';

export function LoadingPanel({ message = 'Loading scientific data...' }: { message?: string }) {
  return (
    <div
      role="status"
      className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3"
    >
      <Loader2 className="w-7 h-7 text-[#0B5ED7] animate-spin" />
      <p className="text-sm font-medium text-[#68788F]">{message}</p>
    </div>
  );
}

export function ErrorPanel({
  title = 'Backend Data Unavailable',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="bg-[#FFFFFF] border border-[#F28B45]/50 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3"
    >
      <AlertTriangle className="w-7 h-7 text-[#F28B45]" />
      <div className="space-y-1">
        <h3 className="font-display font-semibold text-base text-[#142B50]">{title}</h3>
        <p className="text-sm text-[#68788F] max-w-md">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B5ED7] text-[#FFFFFF] text-xs font-semibold hover:bg-[#094DB3] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
}

export function InfoNote({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'danger' }) {
  const styles = {
    info: 'bg-[#EDF3FA] border-[#0B5ED7]/20 text-[#142B50]',
    warn: 'bg-[#FFF4E5] border-[#A15C00]/30 text-[#6B3F00]',
    danger: 'bg-[#FDECEC] border-[#B42318]/30 text-[#7A1A12]',
  }[tone];
  return (
    <div className={`flex gap-2.5 border rounded-xl px-4 py-3 text-xs leading-relaxed ${styles}`}>
      <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function StatusChip({ status }: { status: DataStatusKind }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StateChip({ state }: { state: DataState }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${DATA_STATE_STYLE[state]}`}>
      {DATA_STATE_LABEL[state]}
    </span>
  );
}
