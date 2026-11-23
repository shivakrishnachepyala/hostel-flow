import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle, 
  X, 
  User, 
  Calendar, 
  FileText, 
  Copy, 
  Check,
  Building2,
  DollarSign
} from 'lucide-react';
import { Payment, Student } from '../../types';
import { apiClient } from '../../services/apiClient';

interface PaymentsSectionProps {
  payments: Payment[];
  students: Student[];
  onRefresh: () => void;
}

export const PaymentsSection: React.FC<PaymentsSectionProps> = ({
  payments,
  students,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Receipt modal
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 6000);
  };

  // KPIs
  const totalPaid = payments
    .filter(p => p.Payment_Status === 'Paid')
    .reduce((sum, p) => sum + (Number(p.Amount) || 0), 0);

  const totalPending = payments
    .filter(p => p.Payment_Status === 'Pending' || !p.Payment_Status)
    .reduce((sum, p) => sum + (Number(p.Amount) || 0), 0);

  const paidCount = payments.filter(p => p.Payment_Status === 'Paid').length;
  const successRate = payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 100;

  // Filtered payments
  const filtered = payments.filter(p => {
    const student = students.find(s => s.Student_ID === p.Student_ID);
    const studentName = p.Student_Name || student?.Name || '';
    const ref = p.Transaction_Reference || '';

    const matchesSearch = 
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.Payment_ID).includes(searchTerm) ||
      String(p.Student_ID).includes(searchTerm);

    const matchesStatus = statusFilter === 'All' || p.Payment_Status === statusFilter;
    const matchesMethod = methodFilter === 'All' || (p.Payment_Method || '').toLowerCase() === methodFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete payment record #${id}?`)) return;

    try {
      await apiClient.delete(`/payments/${id}`);
      showSuccess(`Payment record #${id} removed successfully.`);
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to delete payment.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80">
              Financial Ledger
            </span>
            <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">Fee Collections & Receipts</span>
          </div>
          <h2 className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Financial Transactions & Receipts
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Complete audit trail of student hostel fee payments, pending dues, and verified transactions.
          </p>
        </div>
      </div>

      {/* 2. Notification Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 3. Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Total Revenue Collected</div>
            <div className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400">
              ₹{totalPaid.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              {paidCount} cleared transactions
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Pending Receivables</div>
            <div className="text-2xl font-black font-display text-amber-600 dark:text-amber-400">
              ₹{totalPending.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Awaiting clearance</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Total Transactions</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">
              {payments.length}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Recorded in database</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Collection Success Rate</div>
            <div className="text-2xl font-black font-display text-teal-600 dark:text-teal-400">
              {successRate}%
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Payment settlement ratio</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by student, transaction ref, or payment ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="All">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="Net Banking">Net Banking</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Cash">Cash</option>
          </select>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {['All', 'Paid', 'Pending', 'Failed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-[#182235] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E293B]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Payments Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#182235] border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Receipt ID</th>
                <th className="py-3 px-4">Student Resident</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Date & Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
              {filtered.map(p => {
                const student = students.find(s => s.Student_ID === p.Student_ID);
                const studentName = p.Student_Name || student?.Name || `Student #${p.Student_ID}`;
                const studentDept = p.Student_Dept || student?.Department || 'Student';
                const isPaid = p.Payment_Status === 'Paid';
                const isPending = p.Payment_Status === 'Pending' || !p.Payment_Status;

                return (
                  <tr key={p.Payment_ID} className="hover:bg-slate-50 dark:hover:bg-[#182235]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-[#F1F5F9]">#{p.Payment_ID}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-xs flex-shrink-0">
                          {studentName[0]}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">{studentName}</span>
                          <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono">
                            ID: #{p.Student_ID} · {studentDept}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-sm font-black font-display ${
                        isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-[#F1F5F9]'
                      }`}>
                        ₹{Number(p.Amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#94A3B8]">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-[#F1F5F9]">{p.Payment_Date || '—'}</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]">{p.Payment_Method || 'UPI / NetBanking'}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isPaid 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                          : isPending
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                      }`}>
                        {p.Payment_Status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-[#94A3B8]">
                        <span className="max-w-[140px] truncate">{p.Transaction_Reference || '—'}</span>
                        {p.Transaction_Reference && (
                          <button
                            onClick={() => handleCopyRef(p.Transaction_Reference!)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-[#F1F5F9] cursor-pointer"
                            title="Copy Reference"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setViewingPayment(p)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
                          title="View Payment Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.Payment_ID)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Payment Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-[#94A3B8]">
                    <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700 dark:text-[#F1F5F9]">No payments found</p>
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">Try adjusting your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. View Receipt Modal */}
      {viewingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-200 dark:border-[#334155] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-[#F1F5F9]">Payment Receipt</h3>
                  <p className="text-xs text-slate-400 dark:text-[#94A3B8]">Transaction #{viewingPayment.Payment_ID}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingPayment(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="p-4 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl space-y-3 text-xs">
              <div className="text-center pb-3 border-b border-slate-200 dark:border-[#334155]">
                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8]">Total Amount</div>
                <div className="text-3xl font-black font-display text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ₹{Number(viewingPayment.Amount).toLocaleString()}
                </div>
                <div className="mt-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    viewingPayment.Payment_Status === 'Paid'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
                  }`}>
                    {viewingPayment.Payment_Status || 'Pending'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-[#94A3B8]">Student Resident:</span>
                  <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">
                    {viewingPayment.Student_Name || `Student #${viewingPayment.Student_ID}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-[#94A3B8]">Payment Date:</span>
                  <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">{viewingPayment.Payment_Date || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-[#94A3B8]">Payment Method:</span>
                  <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">{viewingPayment.Payment_Method || 'UPI'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-[#94A3B8]">Payment Type:</span>
                  <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">{viewingPayment.Payment_Type || 'Hostel Fee'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-[#334155]">
                  <span className="text-slate-400 dark:text-[#94A3B8]">Transaction Ref:</span>
                  <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>{viewingPayment.Transaction_Reference || '—'}</span>
                    {viewingPayment.Transaction_Reference && (
                      <button
                        onClick={() => handleCopyRef(viewingPayment.Transaction_Reference!)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-[#1E293B] rounded-sm transition-colors cursor-pointer"
                        title="Copy Reference"
                      >
                        {copiedRef ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setViewingPayment(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#182235] hover:bg-slate-200 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
