import { useState, useCallback, useEffect, useRef, useMemo } from 'react'

interface ChatParams {
  idInstance: string
  apiTokenInstance: string
  phoneNumber: string
}

interface Message {
  id: string
  text: string
  status: 'pending' | 'sent' | 'error' | 'received'
  timestamp: number
}

interface GreenApiNotification {
  receiptId: number
  body: {
    typeWebhook: string
    idMessage: string
    senderData?: {
      chatId: string
    }
    messageData?: {
      textMessageData?: {
        textMessage?: string
      }
    }
  }
}

interface CheckAccResponse {
  exist: boolean
  chatId: string
  fromCache: boolean
  status: boolean
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      }, { once: true })
    }
  })

export function useChat(params: ChatParams) {
  const { idInstance, apiTokenInstance, phoneNumber } = params

  const baseUrl = useMemo(
    () => `https://api.green-api.com/waInstance${idInstance}`,
    [idInstance]
  )

  const [chatId, setChatId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sendPending, setSendPending] = useState(false)

  // Сброс сообщений при смене учётки/номера.
  useEffect(() => {
    setMessages([])
  }, [idInstance, apiTokenInstance, phoneNumber])

  const tempIdRef = useRef(0)

  // --- sendMessage ---
  const submit = useCallback(
    async (text: string) => {
      if (!chatId) {
        console.warn('useChat.submit: chatId ещё не получен')
        return
      }

      const tempId = `temp-${++tempIdRef.current}`
      const timestamp = Date.now()

      setMessages((prev) => [
        ...prev,
        { id: tempId, text, status: 'pending', timestamp },
      ])

      setSendPending(true)

      try {
        const res = await fetch(
          `${baseUrl}/sendMessage/${apiTokenInstance}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message: text }),
          }
        )

        if (!res.ok) {
          throw new Error(`Ошибка ${res.status}: ${res.statusText}`)
        }

        const data = await res.json()

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, id: data.idMessage, status: 'sent' }
              : msg
          )
        )
      } catch (e) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, status: 'error' } : msg
          )
        )
        console.error(e)
      } finally {
        setSendPending(false)
      }
    },
    [baseUrl, apiTokenInstance, chatId]
  )

  // --- checkAccount: один POST при смене учётки/номера ---
  useEffect(() => {
    const controller = new AbortController()

    const run = async () => {
      try {
        const res = await fetch(
          `${baseUrl}/checkAccount/${apiTokenInstance}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, force: true }),
            signal: controller.signal,
          }
        )

        if (!res.ok) {
          throw new Error(`checkAccount: ${res.status} ${res.statusText}`)
        }

        const acc: CheckAccResponse = await res.json()
        console.log(acc)
        if (controller.signal.aborted) return

        setChatId(acc.chatId || '')
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        console.error(err)
        setChatId('')
      }
    }

    void run()

    return () => {
      controller.abort()
    }
  }, [baseUrl, apiTokenInstance, phoneNumber])

  // --- polling входящих ---
  useEffect(() => {
    if (!chatId) return

    let stopped = false
    const controller = new AbortController()

    const poll = async () => {
      while (!stopped) {
        try {
          const res = await fetch(
            `${baseUrl}/receiveNotification/${apiTokenInstance}`,
            { signal: controller.signal }
          )

          if (!res.ok) {
            throw new Error(`receiveNotification: ${res.status}`)
          }

          const notification: GreenApiNotification | null = await res
            .json()
            .catch(() => null)

          if (stopped) break

          if (!notification || !notification.receiptId) {
            await sleep(2000, controller.signal)
            continue
          }

          const { body } = notification

          if (
            body.typeWebhook === 'incomingMessageReceived' &&
            body.senderData?.chatId === chatId
          ) {
            const id = body.idMessage
            const text =
              body.messageData?.textMessageData?.textMessage ?? ''

            setMessages((prev) =>
              prev.some((m) => m.id === id)
                ? prev
                : [
                  ...prev,
                  {
                    id,
                    status: 'received',
                    text,
                    timestamp: Date.now(),
                  },
                ]
            )
          }

          await fetch(
            `${baseUrl}/deleteNotification/${apiTokenInstance}/${notification.receiptId}`,
            { method: 'DELETE', signal: controller.signal }
          )
        } catch (err) {
          if (stopped || (err as Error).name === 'AbortError') break
          console.error(err)
          try {
            await sleep(2000, controller.signal)
          } catch {
            break
          }
        }
      }
    }

    void poll()

    return () => {
      stopped = true
      controller.abort()
    }
  }, [baseUrl, apiTokenInstance, chatId])

  return { messages, submit, sendPending }
}
