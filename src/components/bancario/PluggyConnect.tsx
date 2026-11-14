import { useState, useRef } from 'react'
import { usePluggy } from '@/hooks/usePluggy'
import { Button } from '@/components/ui/button'
import { Link2, Loader2, Building2, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  onSuccess: (itemId: string) => void
  onError?: (error: any) => void
}

export function PluggyConnect({ onSuccess, onError }: Props) {
  const { criarConnectToken, loading } = usePluggy()
  const containerRef = useRef<HTMLDivElement>(null)
  const [conectando, setConectando] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [widgetLoaded, setWidgetLoaded] = useState(false)
  const [loadingStep, setLoadingStep] = useState<'token' | 'sdk' | 'render' | 'done'>('token')

  const handleConnect = async () => {
    setConectando(true)
    setWidgetLoaded(false)
    setLoadingStep('token')

    try {
      const token = await criarConnectToken()
      if (!token) throw new Error('Token não gerado')

      setLoadingStep('sdk')
      setDialogOpen(true)

      setTimeout(async () => {
        try {
          const { PluggyConnect: SDK } = await import('pluggy-connect-sdk')

          setLoadingStep('render')

          const instance = new SDK({
            connectToken: token,
            onSuccess: ({ item }: any) => {
              setConectando(false)
              setDialogOpen(false)
              setWidgetLoaded(false)
              onSuccess(item.id)
            },
            onError: (error: any) => {
              setConectando(false)
              setDialogOpen(false)
              setWidgetLoaded(false)
              onError?.(error)
            },
            onClose: () => {
              setConectando(false)
              setDialogOpen(false)
              setWidgetLoaded(false)
            },
            onOpen: () => {
              setWidgetLoaded(true)
              setLoadingStep('done')
            },
          })

          if (containerRef.current) {
            containerRef.current.innerHTML = ''
            await (instance as any).render(containerRef.current)
            // Fallback: mark as loaded after render resolves
            setTimeout(() => {
              setWidgetLoaded(true)
              setLoadingStep('done')
            }, 2000)
          }
        } catch (err) {
          console.error('Erro ao renderizar Pluggy Connect:', err)
          setConectando(false)
          setDialogOpen(false)
          setWidgetLoaded(false)
          onError?.(err)
        }
      }, 300)
    } catch (err) {
      console.error('Erro ao abrir Pluggy Connect:', err)
      setConectando(false)
      onError?.(err)
    }
  }

  const stepLabels: Record<string, string> = {
    token: 'Autenticando com Open Finance…',
    sdk: 'Carregando módulo de conexão…',
    render: 'Preparando interface do banco…',
    done: '',
  }

  return (
    <>
      <Button
        onClick={handleConnect}
        disabled={loading || conectando}
        className="gap-2"
        style={{
          background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
          color: 'white',
        }}
      >
        {(loading || conectando)
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Link2 className="w-4 h-4" />
        }
        {conectando ? 'Conectando…' : 'Conectar banco via Open Finance'}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDialogOpen(false)
          setConectando(false)
          setWidgetLoaded(false)
        }
      }}>
        <DialogContent className="max-w-[380px] min-h-[600px] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Conectar Banco
            </DialogTitle>
          </DialogHeader>

          <div className="relative w-full min-h-[560px]">
            {/* Loading overlay */}
            {!widgetLoaded && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Building2 className="w-10 h-10 text-primary" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>

                <div className="text-center space-y-2 px-6">
                  <p className="text-sm font-medium text-foreground">
                    {stepLabels[loadingStep]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Isso pode levar alguns segundos
                  </p>
                </div>

                {/* Progress steps */}
                <div className="flex items-center gap-2 px-6">
                  {(['token', 'sdk', 'render'] as const).map((step, i) => {
                    const stepOrder = { token: 0, sdk: 1, render: 2, done: 3 }
                    const current = stepOrder[loadingStep]
                    const isComplete = current > i
                    const isActive = current === i
                    return (
                      <div key={step} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          isComplete ? 'bg-primary scale-100' : isActive ? 'bg-primary/60 animate-pulse scale-110' : 'bg-muted'
                        }`} />
                        {i < 2 && <div className={`w-8 h-0.5 transition-all duration-300 ${
                          isComplete ? 'bg-primary' : 'bg-muted'
                        }`} />}
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Conexão segura via Open Finance</span>
                </div>
              </div>
            )}

            {/* SDK container */}
            <div
              ref={containerRef}
              className="w-full min-h-[560px]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
