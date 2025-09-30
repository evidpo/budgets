import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import ProgressBar from '../components/ui/ProgressBar';
import { api } from '../lib/api';
import { Account, Category, Debt, CreateTransactionData } from '../lib/types';
import { supabase } from '../lib/supabase';

interface ImportedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  payee: string;
  note: string;
  account: string;
  category: string;
  debt: string;
  originalData: any;
  mappedAccount?: string;
  mappedCategory?: string;
  mappedDebt?: string;
}

interface TransferCandidate {
  id: string;
  fromTx: ImportedTransaction;
  toTx: ImportedTransaction;
  amount: number;
  dateDiff: number;
  confirmed: boolean;
}

interface ColumnMapping {
  date: string | null;
  amount: string | null;
  description: string | null;
  payee: string | null;
  note: string | null;
  account: string | null;
  category: string | null;
  debt: string | null;
}

const ImportPage = ({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: null,
    amount: null,
    description: null,
    payee: null,
    note: null,
    account: null,
    category: null,
    debt: null
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [mappedTransactions, setMappedTransactions] = useState<ImportedTransaction[]>([]);
  const [transferCandidates, setTransferCandidates] = useState<TransferCandidate[]>([]);
  const [confirmedTransfers, setConfirmedTransfers] = useState<TransferCandidate[]>([]);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [rollbackModalOpen, setRollbackModalOpen] = useState<boolean>(false);
  const [importId, setImportId] = useState<string>('');
  const [householdId, setHouseholdId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  useEffect(() => {
    const fetchUserAndHousehold = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Здесь нужно получить реальный ID домохозяйства пользователя
        // Пока используем заглушку, но в реальном приложении это будет из контекста или API
        const realHouseholdId = 'current_household_id'; // Заменить на реальный ID
        setHouseholdId(realHouseholdId);
        loadAccounts(realHouseholdId);
        loadCategories(realHouseholdId);
        loadDebts(realHouseholdId);
      }
    };
    
    fetchUserAndHousehold();
  }, []);
  
  const loadAccounts = async () => {
    try {
      const { data, error } = await api.getAccounts(householdId);
      if (error) throw new Error(error);
      if (data) setAccounts(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await api.getCategories(householdId);
      if (error) throw new Error(error);
      if (data) setCategories(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadDebts = async () => {
    try {
      const { data, error } = await api.getDebts(householdId);
      if (error) throw new Error(error);
      if (data) setDebts(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Поддерживаются только CSV файлы');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFileContent(content);
        
        const lines = content.split('\n');
        if (lines.length > 0) {
          const headerLine = lines[0];
          const csvHeaders = headerLine.split(',').map(header => header.trim().replace(/"/g, ''));
          setHeaders(csvHeaders);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const autoDetectFormat = () => {
    const newMapping: ColumnMapping = {
      date: null,
      amount: null,
      description: null,
      payee: null,
      note: null,
      account: null,
      category: null,
      debt: null
    };

    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      if (!newMapping.date && (lowerHeader.includes('date') || lowerHeader.includes('дата'))) {
        newMapping.date = header;
      } else if (!newMapping.amount && (lowerHeader.includes('amount') || lowerHeader.includes('сумма'))) {
        newMapping.amount = header;
      } else if (!newMapping.description && (lowerHeader.includes('description') || lowerHeader.includes('описание') || lowerHeader.includes('назначение'))) {
        newMapping.description = header;
      } else if (!newMapping.payee && (lowerHeader.includes('payee') || lowerHeader.includes('контрагент') || lowerHeader.includes('получатель'))) {
        newMapping.payee = header;
      } else if (!newMapping.note && (lowerHeader.includes('note') || lowerHeader.includes('примечание') || lowerHeader.includes('комментарий'))) {
        newMapping.note = header;
      } else if (!newMapping.account && (lowerHeader.includes('account') || lowerHeader.includes('счет') || lowerHeader.includes('аккаунт'))) {
        newMapping.account = header;
      } else if (!newMapping.category && (lowerHeader.includes('category') || lowerHeader.includes('категория'))) {
        newMapping.category = header;
      } else if (!newMapping.debt && (lowerHeader.includes('debt') || lowerHeader.includes('долг') || lowerHeader.includes('обязательство'))) {
        newMapping.debt = header;
      }
    });

    setColumnMapping(newMapping);
  };

  const handleColumnMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value === 'none' ? null : value
    }));
  };

  const mapTransactions = () => {
    if (!fileContent || !columnMapping.date || !columnMapping.amount) {
      setError('Необходимо указать хотя бы колонки даты и суммы');
      return;
    }

    const lines = fileContent.split('\n');
    const result: ImportedTransaction[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      if (columns.length !== headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = columns[index];
      });

      const transaction: ImportedTransaction = {
        id: `temp-${i}`,
        date: row[columnMapping.date!],
        amount: parseFloat(row[columnMapping.amount!]),
        description: columnMapping.description ? row[columnMapping.description] : '',
        payee: columnMapping.payee ? row[columnMapping.payee] : '',
        note: columnMapping.note ? row[columnMapping.note] : '',
        account: columnMapping.account ? row[columnMapping.account] : '',
        category: columnMapping.category ? row[columnMapping.category] : '',
        debt: columnMapping.debt ? row[columnMapping.debt] : '',
        originalData: row
      };

      result.push(transaction);
    }

    setTransactions(result);
    setMappedTransactions(result);
  };

  const findTransferCandidates = () => {
    const candidates: TransferCandidate[] = [];
    
    for (let i = 0; i < mappedTransactions.length; i++) {
      for (let j = i + 1; j < mappedTransactions.length; j++) {
        const tx1 = mappedTransactions[i];
        const tx2 = mappedTransactions[j];
        
        if (Math.abs(Math.abs(tx1.amount) - Math.abs(tx2.amount)) < 0.01 && 
            Math.sign(tx1.amount) !== Math.sign(tx2.amount)) {
          
          if (tx1.account !== tx2.account) {
            const date1 = new Date(tx1.date);
            const date2 = new Date(tx2.date);
            const timeDiff = Math.abs(date1.getTime() - date2.getTime());
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            if (daysDiff <= 3) {
              candidates.push({
                id: `candidate-${i}-${j}`,
                fromTx: tx1.amount > 0 ? tx2 : tx1,
                toTx: tx1.amount > 0 ? tx1 : tx2,
                amount: Math.abs(tx1.amount),
                dateDiff: daysDiff,
                confirmed: false
              });
            }
          }
        }
      }
    }
    
    setTransferCandidates(candidates);
  };

  const confirmTransfer = (candidateId: string) => {
    setTransferCandidates(prev => 
      prev.map(candidate => 
        candidate.id === candidateId ? { ...candidate, confirmed: true } : candidate
      )
    );
    
    const confirmed = transferCandidates
      .filter(candidate => candidate.id === candidateId || candidate.confirmed)
      .map(candidate => 
        candidate.id === candidateId ? { ...candidate, confirmed: true } : candidate
      );
    setConfirmedTransfers(confirmed);
  };

  const unconfirmTransfer = (candidateId: string) => {
    setTransferCandidates(prev => 
      prev.map(candidate => 
        candidate.id === candidateId ? { ...candidate, confirmed: false } : candidate
      )
    );
    
    setConfirmedTransfers(prev => prev.filter(t => t.id !== candidateId));
  };

  const importTransactions = async () => {
    try {
      setImportStatus('importing');
      setImportProgress(0);
      
      const transactionsToImport = mappedTransactions.filter(tx => {
        return !confirmedTransfers.some(transfer =>
          transfer.fromTx.id === tx.id || transfer.toTx.id === tx.id
        );
      });
      
      const transactionsForImport = transactionsToImport.map(tx => {
        const accountId = accounts.find(acc => acc.name === tx.account)?.id;
        
        let categoryId = null;
        if (tx.category) {
          const categoryPath = tx.category.includes(':') ? tx.category : null;
          
          if (categoryPath) {
            categoryId = categories.find(cat => cat.path === categoryPath)?.id;
          } else {
            categoryId = categories.find(cat => cat.name === tx.category)?.id;
          }
        }
        
        const debtId = debts.find(d => d.name === tx.debt)?.id;
        
        const transactionData: CreateTransactionData = {
          household_id: householdId,
          account_id: accountId || accounts[0]?.id,
          amount: tx.amount,
          date: tx.date,
          category_id: categoryId || undefined,
          description: tx.description,
          payee: tx.payee,
          note: tx.note,
          debt_id: debtId || undefined
        };
        
        return transactionData;
      });
      
      for (let i = 0; i < transactionsForImport.length; i++) {
        setImportProgress(Math.floor((i / transactionsForImport.length) * 50));
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      for (let i = 0; i < confirmedTransfers.length; i++) {
        setImportProgress(50 + Math.floor((i / confirmedTransfers.length) * 50));
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const generatedImportId = `import-${Date.now()}`;
      setImportId(generatedImportId);
      
      const importResult = await api.importTransactions(transactionsForImport, generatedImportId);
      if (importResult.error) {
        throw new Error(importResult.error);
      }
      
      setImportStatus('success');
      setSuccessMessage(`Импорт завершен успешно! Импортировано ${transactionsForImport.length} транзакций и ${confirmedTransfers.length} переводов.`);
    } catch (err: any) {
      setImportStatus('error');
      setError(err.message);
    }
  };

  const rollbackImport = async () => {
    try {
      const rollbackResult = await api.rollbackImport(importId);
      if (rollbackResult.error) {
        throw new Error(rollbackResult.error);
      }
      
      setSuccessMessage('Импорт успешно откатан');
      setRollbackModalOpen(false);
      setImportStatus('idle');
      setImportProgress(0);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const transactionColumns = [
    { key: 'date', title: 'Дата' },
    { key: 'description', title: 'Описание' },
    { key: 'payee', title: 'Получатель' },
    { key: 'amount', title: 'Сумма', render: (value: number) => (
      <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    )},
    { key: 'account', title: 'Счет', render: (value: string, record: ImportedTransaction) => (
      <Select
        value={record.mappedAccount || ''}
        options={[
          { value: 'none', label: 'Не выбран' },
          ...accounts.map(acc => ({ value: acc.id, label: acc.name }))
        ]}
        onChange={(e) => {
          const updated = mappedTransactions.map(t =>
            t.id === record.id ? { ...t, mappedAccount: e.target.value } : t
          );
          setMappedTransactions(updated);
        }}
        className="w-40"
      />
    )},
    { key: 'category', title: 'Категория', render: (value: string, record: ImportedTransaction) => (
      <Select
        value={record.mappedCategory || ''}
        options={[
          { value: 'none', label: 'Не выбрана' },
          ...categories.map(cat => ({ value: cat.id, label: cat.path }))
        ]}
        onChange={(e) => {
          const updated = mappedTransactions.map(t =>
            t.id === record.id ? { ...t, mappedCategory: e.target.value } : t
          );
          setMappedTransactions(updated);
        }}
        className="w-40"
      />
    )}
  ];

  const transferColumns = [
    { key: 'fromTx.date', title: 'Дата' },
    { key: 'fromTx.description', title: 'Описание' },
    { key: 'fromTx.amount', title: 'Сумма', render: (value: number, record: TransferCandidate) => (
      <div>
        <div className="text-red-600">{record.fromTx.amount.toFixed(2)}</div>
        <div className="text-green-600">+{record.toTx.amount.toFixed(2)}</div>
      </div>
    )},
    { key: 'fromTx.account', title: 'Счет отправителя', render: (value: string, record: TransferCandidate) => (
      <div>
        <div>{record.fromTx.account}</div>
        <div>{record.toTx.account}</div>
      </div>
    )},
    { key: 'dateDiff', title: 'Разница в днях' },
    { key: 'confirmed', title: 'Подтверждение', render: (value: boolean, record: TransferCandidate) => (
      <div>
        {!record.confirmed ? (
          <Button variant="primary" onClick={() => confirmTransfer(record.id)}>
            Подтвердить как перевод
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => unconfirmTransfer(record.id)}>
            Отменить подтверждение
          </Button>
        )}
      </div>
    )}
  ];

  return (
    <Layout title="Импорт" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Мастер импорта финансовых данных</h2>
        
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Шаг {currentStep} из 5</span>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {currentStep === 1 && 'Загрузка CSV'}
              {currentStep === 2 && 'Маппинг полей'}
              {currentStep === 3 && 'Склейка переводов'}
              {currentStep === 4 && 'Предпросмотр'}
              {currentStep === 5 && 'Запись импорта'}
            </span>
          </div>
          <ProgressBar value={(currentStep / 5) * 100} />
        </div>
        
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card title="Загрузка CSV файла">
              <div className="flex flex-col items-center justify-center w-full">
                <label 
                  htmlFor="csv-upload" 
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-12 h-12 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл сюда
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">CSV (MAX. 10MB)</p>
                    {file && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                        Выбран файл: {file.name}
                      </p>
                    )}
                  </div>
                  <input 
                    id="csv-upload" 
                    type="file" 
                    className="hidden" 
                    accept=".csv" 
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                </label>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium text-gray-800 dark:text-white mb-2">Поддерживаемые форматы</h3>
                <ul className="list-disc pl-5 text-gray-600 dark:text-gray-300 space-y-1">
                  <li>CSV (Alzex и стандартный формат)</li>
                  <li>Дата, сумма, описание, категория (с поддержкой дерева через :), счёт, получатель</li>
                  <li>Для формата Alzex: дата, сумма, категория, счёт, описание</li>
                </ul>
              </div>
            </Card>
            
            <div className="flex justify-between">
              <div></div>
              <Button 
                variant="primary" 
                onClick={() => {
                  if (!file) {
                    setError('Пожалуйста, выберите файл для импорта');
                    return;
                  }
                  autoDetectFormat();
                  setCurrentStep(2);
                }}
                disabled={!file}
              >
                Продолжить
              </Button>
            </div>
          </div>
        )}
        
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card title="Маппинг полей CSV">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Сопоставьте колонки из CSV файла с полями транзакции
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Select
                  label={<span>Дата <span className="text-red-500">*</span></span>}
                  value={columnMapping.date || 'none'}
                  options={[
                    { value: 'none', label: 'Выберите колонку' },
                    ...headers.map(header => ({ value: header, label: header }))
                  ]}
                  onChange={(e) => handleColumnMappingChange('date', e.target.value)}
                />
                
                <Select
                  label={<span>Сумма <span className="text-red-500">*</span></span>}
                  value={columnMapping.amount || 'none'}
                  options={[
                    { value: 'none', label: 'Выберите колонку' },
                    ...headers.map(header => ({ value: header, label: header }))
                  ]}
                  onChange={(e) => handleColumnMappingChange('amount', e.target.value)}
                />
                
                <Select
                  label="Описание"
                  value={columnMapping.description || 'none'}
                  options={[
                    { value: 'none', label: 'Не использовать' },
                    ...headers.map(header => ({ value: header, label: header }))
                  ]}
                  onChange={(e) => handleColumnMappingChange('description', e.target.value)}
                />
                
                <Select
                  label="Получатель (Payee)"
                  value={columnMapping.payee || 'none'}
                  options={[
                    { value: 'none', label: 'Не использовать' },
                    ...headers.map(header => ({ value: header, label: header }))
                  ]}
                  onChange={(e) => handleColumnMappingChange('payee', e.target.value)}
                />
                
                <Select
                  label="Комментарий"
                  value={columnMapping.note || 'none'}
                  options={[
                    { value: 'none', label: 'Не использовать' },
                    ...headers.map(header => ({ value: header, label: header }))
                  ]}
                  onChange={(e) => handleColumnMappingChange('note', e.target.value)}
                />
                
                <Select
                  label="Счет"
                  value={columnMapping.account || 'none'}
                  options={[
                    { value: 'none', label: 'Не использовать' },
                    ...headers.map(header => ({ value: header, label: header }))
                  ]}
                  onChange={(e) => handleColumnMappingChange('account', e.target.value)}
                />
                
                <Select
                  label="Категория"
                  value={columnMapping.category || 'none'}
                  options={[
                    { value: 'none', label: 'Не использовать' },
                    ...headers.map(header => ({ value: header, label: header }))
                  ]}
                  onChange={(e) => handleColumnMappingChange('category', e.target.value)}
                />
                
                <Select
                  label="Долг"
                  value={columnMapping.debt || 'none'}
                  options={[
                    { value: 'none', label: 'Не использовать' },
                    ...headers.map(header => ({ value: header, label: header }))
                  ]}
                  onChange={(e) => handleColumnMappingChange('debt', e.target.value)}
                />
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="secondary" 
                  onClick={() => setCurrentStep(1)}
                >
                  Назад
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    if (!columnMapping.date || !columnMapping.amount) {
                      setError('Необходимо указать хотя бы колонки даты и суммы');
                      return;
                    }
                    mapTransactions();
                    setCurrentStep(3);
                  }}
                >
                  Продолжить
                </Button>
              </div>
            </Card>
          </div>
        )}
        
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card title="Склейка переводов">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Система автоматически нашла возможные переводы. Подтвердите или отклоните каждую пару.
                Эвристика: ±сумма, встречные знаки, разные счета, окно ±3 дня.
              </p>
              
              {transferCandidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table
                    data={transferCandidates}
                    columns={transferColumns}
                    emptyText="Переводы не найдены"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Возможные переводы не найдены. Нажмите кнопку для поиска.
                </div>
              )}
              
              <div className="mt-6 flex justify-between">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    findTransferCandidates();
                  }}
                >
                  Найти переводы
                </Button>
                <div className="space-x-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => setCurrentStep(2)}
                  >
                    Назад
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => setCurrentStep(4)}
                  >
                    Продолжить
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {currentStep === 4 && (
          <div className="space-y-6">
            <Card title="Предпросмотр импорта">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Ниже показаны транзакции, которые будут импортированы. 
                {confirmedTransfers.length > 0 && ` Подтвержденные переводы: ${confirmedTransfers.length}.`}
              </p>
              
              <div className="overflow-x-auto">
                <Table
                  data={mappedTransactions}
                  columns={transactionColumns}
                  emptyText="Нет транзакций для импорта"
                />
              </div>
              
              <div className="mt-6 flex justify-between">
                <Button 
                  variant="secondary" 
                  onClick={() => setCurrentStep(3)}
                >
                  Назад
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => setCurrentStep(5)}
                >
                  Продолжить
                </Button>
              </div>
            </Card>
          </div>
        )}
        
        {currentStep === 5 && (
          <div className="space-y-6">
            <Card title="Запись импорта">
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Готовы выполнить импорт {mappedTransactions.length} транзакций, 
                  включая {confirmedTransfers.length} подтвержденных переводов?
                </p>
                
                {importStatus === 'importing' && (
                  <div className="mt-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Прогресс импорта</span>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{importProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {importStatus === 'success' && (
                  <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md dark:bg-green-900 dark:text-green-200">
                    {successMessage}
                  </div>
                )}
                
                {importStatus === 'error' && (
                  <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md dark:bg-red-900 dark:text-red-200">
                    {error}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="secondary" 
                  onClick={() => setCurrentStep(4)}
                  disabled={importStatus === 'importing'}
                >
                  Назад
                </Button>
                <div className="space-x-2">
                  {importStatus === 'idle' && (
                    <Button 
                      variant="primary" 
                      onClick={importTransactions}
                    >
                      Выполнить импорт
                    </Button>
                  )}
                  {importStatus === 'success' && importId && (
                    <Button 
                      variant="danger" 
                      onClick={() => setRollbackModalOpen(true)}
                    >
                      Откатить импорт
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
        
        <Modal 
          isOpen={rollbackModalOpen} 
          onClose={() => setRollbackModalOpen(false)} 
          title="Подтверждение отката импорта"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              Вы уверены, что хотите откатить импорт? Все транзакции, импортированные в рамках этой операции, будут удалены.
            </p>
            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                variant="secondary" 
                onClick={() => setRollbackModalOpen(false)}
              >
                Отмена
              </Button>
              <Button 
                variant="danger" 
                onClick={rollbackImport}
              >
                Подтвердить откат
              </Button>
            </div>
          </div>
        </Modal>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ImportPage;