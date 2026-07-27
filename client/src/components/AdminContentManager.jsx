import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';

const CONFIG = {
  foods: {
    table: 'foods',
    fields: [
      ['name', 'Food name', 'text'],
      ['region', 'Region', 'text'],
      ['serving_size', 'Serving size', 'number'],
      ['unit', 'Unit', 'text'],
      ['calories', 'Calories', 'number'],
      ['protein', 'Protein (g)', 'number'],
      ['carbohydrates', 'Carbohydrates (g)', 'number'],
      ['fat', 'Fat (g)', 'number'],
      ['fibre', 'Fibre (g)', 'number'],
    ],
    defaults: { name: '', region: '', serving_size: 100, unit: 'g', calories: 0, protein: 0, carbohydrates: 0, fat: 0, fibre: 0, active: true },
  },
  exercises: {
    table: 'exercise_templates',
    fields: [
      ['name', 'Exercise name', 'text'],
      ['category', 'Category', 'text'],
      ['fitness_level', 'Fitness level', 'text'],
      ['duration_minutes', 'Duration (minutes)', 'number'],
      ['instructions', 'Instructions', 'textarea'],
      ['safety_notes', 'Safety notes', 'textarea'],
    ],
    defaults: { name: '', category: 'Walking', fitness_level: 'Beginner', duration_minutes: 20, instructions: '', safety_notes: '', active: true },
  },
  templates: {
    table: 'diet_templates',
    fields: [
      ['name', 'Template name', 'text'],
      ['diet_type', 'Diet type', 'text'],
      ['region', 'Region', 'text'],
      ['calorie_band', 'Calorie band', 'text'],
    ],
    defaults: { name: '', diet_type: 'Vegetarian', region: '', calorie_band: '1600-2000', template: {}, active: true },
  },
  notices: {
    table: 'system_notices',
    fields: [
      ['title', 'Title', 'text'],
      ['message', 'Message', 'textarea'],
      ['severity', 'Severity', 'text'],
    ],
    defaults: { title: '', message: '', severity: 'info', active: true },
  },
};

export default function AdminContentManager({ type, showToast }) {
  const config = CONFIG[type];
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(config.defaults);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const result = await supabase.from(config.table).select('*').order('created_at', { ascending: false }).limit(200);
    if (result.error) showToast(`${result.error.message}. Run migration 004_product_management.sql.`, 'error');
    setItems(result.data || []);
    setLoading(false);
  };

  useEffect(() => {
    setForm(config.defaults);
    setEditingId(null);
    load();
  }, [type]);

  const save = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => {
      const field = config.fields.find(([name]) => name === key);
      return [key, field?.[2] === 'number' ? Number(value) : value];
    }));
    const result = editingId
      ? await supabase.from(config.table).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
      : await supabase.from(config.table).insert(payload);
    if (result.error) return showToast(result.error.message, 'error');
    showToast(editingId ? 'Item updated' : 'Item created', 'success');
    setForm(config.defaults);
    setEditingId(null);
    load();
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm({ ...config.defaults, ...item });
  };

  const toggle = async (item) => {
    const result = await supabase.from(config.table).update({ active: !item.active, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (result.error) return showToast(result.error.message, 'error');
    load();
  };

  return <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
    <form onSubmit={save} className="card h-fit p-5">
      <h2 className="text-xl font-bold">{editingId ? 'Edit' : 'Add'} {type.slice(0, -1)}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {config.fields.map(([name, label, inputType]) => <div key={name}>
          <label className="label" htmlFor={`admin-${type}-${name}`}>{label}</label>
          {inputType === 'textarea'
            ? <textarea id={`admin-${type}-${name}`} className="input min-h-24" required={['instructions','message'].includes(name)} value={form[name] ?? ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} />
            : <input id={`admin-${type}-${name}`} className="input" type={inputType} required={['name','title'].includes(name)} value={form[name] ?? ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} />}
        </div>)}
      </div>
      <div className="mt-5 flex gap-3"><button className="btn-primary">{editingId ? 'Save changes' : 'Create'}</button>{editingId && <button type="button" className="btn-ghost" onClick={() => { setEditingId(null); setForm(config.defaults); }}>Cancel</button>}</div>
    </form>
    <div className="card overflow-hidden">
      <div className="border-b border-white/10 p-5"><h2 className="text-xl font-bold capitalize">{type}</h2><p className="text-sm text-white/45">{items.length} configured</p></div>
      {loading ? <p className="p-6 text-white/50">Loading…</p> : items.length ? <div className="divide-y divide-white/10">{items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 p-4"><div><p className="font-semibold">{item.name || item.title}</p><p className="mt-1 line-clamp-2 text-xs text-white/45">{item.region || item.category || item.message || item.diet_type}</p></div><div className="flex shrink-0 gap-2"><button className="text-xs font-semibold text-blue-300" onClick={() => edit(item)}>Edit</button><button className={`text-xs font-semibold ${item.active ? 'text-amber-300' : 'text-teal'}`} onClick={() => toggle(item)}>{item.active ? 'Disable' : 'Enable'}</button></div></div>)}</div> : <p className="p-6 text-white/50">No items yet.</p>}
    </div>
  </div>;
}
