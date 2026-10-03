import { useState, useCallback, useEffect, useRef } from 'react'

interface ChatParams {
  idInstance: string
  apiTokenInstance: string
  phoneNumber: string
}

interface Message {
  id: string
  text: string
  status: 'pending' | 'sent' | 'error' | 'received'
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

export function useChat(params: ChatParams) {
  const { idInstance, apiTokenInstance, phoneNumber } = params
  const baseUrl = `https://api.green-api.com/waInstance${idInstance}`
  const chatId = `${phoneNumber.replace(/\D/g, '')}@c.us`
  const [sendPending, setSendPending] = useState(false)

  const [messages, setMessages] = useState<Message[]>([])
  useEffect(() => {
    setMessages([])
  }, [idInstance, apiTokenInstance, phoneNumber])

  const tempIdRef = useRef(0)
  const submit = useCallback(
    async (text: string) => {
      // оптимистично добавляем отправляемое сообщение в список с временным id и статусом pending
      const tempId = `temp-${++tempIdRef.current}`
      setMessages((prev) => [
        ...prev,
        { id: tempId, text, status: 'pending' },
      ])

      const url = `${baseUrl}/sendMessage/${apiTokenInstance}`

      setSendPending(true)
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, message: text }),
        })

        if (!response.ok) throw new Error(`Ошибка ${response.status}: ${response.statusText}`)

        const data = await response.json()

        // обновляем статус и id у отправленного сообщения
        setMessages((prev) =>
          prev.map(msg => msg.id === tempId ? { ...msg, id: data.idMessage, status: 'sent' } : msg)
        )
      }
      catch (e) {
        // сообщение не доставлено
        setMessages((prev) =>
          prev.map(msg => msg.id === tempId ? { ...msg, status: 'error' } : msg)
        )
        console.error(e)
      }
      finally {
        setSendPending(false)
      }
    },
    [idInstance, apiTokenInstance, phoneNumber]
  )

  useEffect(() => {
    let stopped = false
    const poll = async () => {
      while (!stopped) {
        try {
          const res = await fetch(`${baseUrl}/receiveNotification/${apiTokenInstance}`)

          const notification: GreenApiNotification | null = await res.json().catch(() => null)
          console.log(notification)

          if (stopped) break
          if (!notification || !notification.receiptId) {
            await new Promise((r) => setTimeout(r, 1000))
            continue
          }

          // добавляем в чат только входящее сообщение только для текущего чата
          if (notification.body.typeWebhook === 'incomingMessageReceived' && notification.body.senderData?.chatId === chatId) {
            setMessages(prev => [
              ...prev,
              { status: 'received', id: notification.body.idMessage, text: notification.body.messageData?.textMessageData?.textMessage || '' },
            ])
          }

          // удаляем любое полученное уведомление
          await fetch(`${baseUrl}/deleteNotification/${apiTokenInstance}/${notification.receiptId}`, { method: 'DELETE' })
        } catch (err) {
          console.error(err)
          if (stopped) break
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
    }

    poll()
    return () => {
      stopped = true
    }
  }, [idInstance, apiTokenInstance, phoneNumber])

  return { messages, submit, sendPending }
}