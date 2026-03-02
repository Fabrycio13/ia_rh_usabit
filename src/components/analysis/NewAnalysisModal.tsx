import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Upload, FileText, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface NewAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NewAnalysisModal = ({ isOpen, onClose }: NewAnalysisModalProps) => {
    const [vaga, setVaga] = useState('');
    const [descricao, setDescricao] = useState('');
    const [uploadType, setUploadType] = useState<'pdf' | 'excel'>('pdf');
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Envio para o Webhook do n8n
        const formData = new FormData();
        formData.append('vaga', vaga);
        formData.append('descricao', descricao);
        files.forEach(file => formData.append('files', file));

        try {
            const response = await fetch('https://n8n.usabitspace.com/webhook/teste-rh', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                // Sucesso
                onClose();
                alert('Análise iniciada com sucesso!');
            } else {
                throw new Error('Erro ao enviar para análise');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao processar análise. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Novo Candidato">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Nome da Vaga *"
                        placeholder="Ex: Designer"
                        value={vaga}
                        onChange={e => setVaga(e.target.value)}
                        required
                    />
                    <Input label="Localização" placeholder="São Paulo, SP" />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400 ml-1">Descrição da Vaga</label>
                    <textarea
                        className="w-full bg-[#0f111a] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#3b82f6] min-h-[100px]"
                        placeholder="Descreva os requisitos da vaga..."
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                    />
                </div>

                <div className="space-y-4">
                    <label className="text-sm font-medium text-slate-400 ml-1">Envio de Currículos</label>

                    <div className="flex p-1 bg-[#0f111a] rounded-lg border border-[rgba(255,255,255,0.1)]">
                        <button
                            type="button"
                            onClick={() => setUploadType('pdf')}
                            className={clsx(
                                'flex-1 flex items-center justify-center space-x-2 py-2 rounded-md transition-all text-sm font-medium',
                                uploadType === 'pdf' ? 'bg-[#1a1d27] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                            )}
                        >
                            <FileText className="w-4 h-4" />
                            <span>PDF (até 200)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setUploadType('excel')}
                            className={clsx(
                                'flex-1 flex items-center justify-center space-x-2 py-2 rounded-md transition-all text-sm font-medium',
                                uploadType === 'excel' ? 'bg-[#1a1d27] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                            )}
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Excel (.xlsx)</span>
                        </button>
                    </div>

                    <div className="border-2 border-dashed border-[rgba(255,255,255,0.1)] rounded-xl p-8 flex flex-col items-center justify-center space-y-3 hover:border-[#3b82f6]/50 transition-colors cursor-pointer relative bg-[#0f111a]/50">
                        <input
                            type="file"
                            multiple={uploadType === 'pdf'}
                            accept={uploadType === 'pdf' ? '.pdf' : '.xlsx, .xls'}
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="bg-[#3b82f6]/10 p-4 rounded-full">
                            <Upload className="w-8 h-8 text-[#3b82f6]" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-white">
                                {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : 'Clique para enviar ou arraste e solte'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {uploadType === 'pdf' ? 'Até 200 PDFs de até 10MB cada' : 'Arquivo Excel padronizado'}
                            </p>
                        </div>
                    </div>
                </div>

                {uploadType === 'excel' && (
                    <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs text-blue-200 leading-relaxed">
                                Utilize nosso modelo de Excel padronizado para garantir que a análise funcione corretamente.
                            </p>
                            <button type="button" className="text-xs font-semibold text-blue-400 hover:underline mt-2">
                                Baixar Exemplo
                            </button>
                        </div>
                    </div>
                )}

                <Button type="submit" className="w-full py-4 text-base font-semibold" isLoading={loading}>
                    Adicionar Candidato
                </Button>
            </form>
        </Modal>
    );
};
