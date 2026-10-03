import { useState, FormEvent } from 'react'
import { useDraftState } from './hooks/useDraftState'
import { useChat } from './hooks/useChat'
import './App.css'

function App() {
  const chatParams = useDraftState({
    idInstance: '',
    apiTokenInstance: '',
    phoneNumber: '',
  })

  const chat = useChat(chatParams.applied)
  const [inputMessage, setInputMessage] = useState('')
  const isSubmittable = inputMessage.trim().length > 0 && !chatParams.hasChanges

  const handleApply = () => {
    chatParams.apply()
  }

  const handleSubmitMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isSubmittable) return

    try {
      await chat.submit(inputMessage)
      setInputMessage('')
    } catch (err) {
      console.error('Ошибка отправки:', err)
    }
  }

  const STATUS_ICONS = {
    pending: '⏳',
    sent: '✔',
    error: '✖',
    received: '⬇',
  }

  return (
    <div className="app">
      {/* Панель настроек */}
      <section className="settings">
        <div className="settings__fields">
          <label className="field">
            <span className="field__label">idInstance</span>
            <input
              type="text"
              value={chatParams.draft.idInstance}
              onChange={(e) => chatParams.update('idInstance', e.target.value)}
              placeholder="Введите idInstance"
            />
          </label>
          <label className="field">
            <span className="field__label">apiTokenInstance</span>
            <input
              type="password"
              value={chatParams.draft.apiTokenInstance}
              onChange={(e) => chatParams.update('apiTokenInstance', e.target.value)}
              placeholder="Введите apiTokenInstance"
            />
          </label>
          <label className="field">
            <span className="field__label">phoneNumber</span>
            <input
              type="text"
              value={chatParams.draft.phoneNumber}
              onChange={(e) => chatParams.update('phoneNumber', e.target.value)}
              placeholder="79991234567"
            />
          </label>
        </div>
        <div className="settings__actions">
          <button
            className="btn btn--primary"
            onClick={handleApply}
            disabled={!chatParams.hasChanges}
          >
            OK
          </button>
          <button
            className="btn"
            onClick={() => chatParams.cancel()}
            disabled={!chatParams.hasChanges}
          >
            Отмена
          </button>
        </div>
      </section>

      {/* Сообщения */}
      <section className="messages">
        {chat.messages.length === 0 ? (
          <p className="messages__empty">Сообщений пока нет</p>
        ) : (
          chat.messages.map((message) => (
            <div className="message" key={message.id}>
              <span className="message__text">{message.text}</span>
              <span
                className={`message__status message__status--${message.status}`}
                title={message.status}
              >
                {STATUS_ICONS[message.status]}
              </span>
            </div>
          ))
        )}
      </section>

      {/* Форма ввода */}
      <form className="composer" onSubmit={handleSubmitMessage}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Привет!"
        />
        <button
          className="btn btn--primary"
          type="submit"
          disabled={!isSubmittable || chat.sendPending}
        >
          Отправить
        </button>
      </form>
    </div>
  )
}

export default App
