'use client'

import { useState } from 'react'

export type Section = {
  id?: string
  type: string
  order: number
  data: any
}

interface Props {
  sections: Section[]
  onChange: (sections: Section[]) => void
}

export default function SectionEditor({ sections: initial, onChange }: Props) {
  const [sections, setSections] = useState<Section[]>(initial)

  const pushChange = (next: Section[]) => {
    setSections(next)
    onChange(next)
  }

  const addSection = (type: string) => {
    const next: Section[] = [
      ...sections,
      { type, order: sections.length, data: defaultData(type) }
    ]
    pushChange(next)
  }

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    for (let i = 0; i < next.length; i++) next[i].order = i
    pushChange(next)
  }

  const remove = (index: number) => {
    if (!confirm('Bu bölümü silmek istediğinize emin misiniz?')) return
    const next = sections.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }))
    pushChange(next)
  }

  const update = (index: number, patch: Partial<Section>) => {
    const next = sections.map((s, i) => (i === index ? { ...s, ...patch } : s))
    pushChange(next)
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => addSection('hero')} className="px-3 py-2 bg-gray-200 rounded">Hero</button>
        <button onClick={() => addSection('rich_text')} className="px-3 py-2 bg-gray-200 rounded">Rich Text</button>
      </div>
      <ul className="space-y-4">
        {sections.map((s, i) => (
          <li key={s.id ?? i} className="border rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-500">{s.type}</div>
              <div className="flex gap-2">
                <button onClick={() => move(i, -1)} className="px-2 py-1 border rounded">Yukarı</button>
                <button onClick={() => move(i, 1)} className="px-2 py-1 border rounded">Aşağı</button>
                <button onClick={() => remove(i)} className="px-2 py-1 border rounded text-red-600">Sil</button>
              </div>
            </div>
            {s.type === 'hero' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Başlık</label>
                  <input value={s.data.title ?? ''} onChange={e => update(i, { data: { ...s.data, title: e.target.value } })} className="w-full border px-3 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Alt Başlık</label>
                  <input value={s.data.subtitle ?? ''} onChange={e => update(i, { data: { ...s.data, subtitle: e.target.value } })} className="w-full border px-3 py-2 rounded" />
                </div>
              </div>
            )}
            {s.type === 'rich_text' && (
              <div>
                <label className="block text-sm mb-1">HTML</label>
                <textarea value={s.data.html ?? ''} onChange={e => update(i, { data: { ...s.data, html: e.target.value } })} className="w-full border px-3 py-2 rounded min-h-[160px]" />
              </div>
            )}
            {s.type === 'cta' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm mb-1">Başlık</label>
                  <input value={s.data.title ?? ''} onChange={e => update(i, { data: { ...s.data, title: e.target.value } })} className="w-full border px-3 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Buton Metni</label>
                  <input value={s.data.buttonText ?? ''} onChange={e => update(i, { data: { ...s.data, buttonText: e.target.value } })} className="w-full border px-3 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Buton Linki</label>
                  <input value={s.data.buttonUrl ?? ''} onChange={e => update(i, { data: { ...s.data, buttonUrl: e.target.value } })} className="w-full border px-3 py-2 rounded" />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function defaultData(type: string) {
  switch (type) {
    case 'hero':
      return { title: 'Başlık', subtitle: 'Alt başlık' }
    case 'rich_text':
      return { html: '<p>Yeni metin</p>' }
    case 'cta':
      return { title: 'Hemen Başlayın', buttonText: 'Detaylı Bilgi', buttonUrl: '/' }
    default:
      return {}
  }
}


