import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Lead, MessageTemplate } from '../types/crm';
import { autocorrigeLead } from './cnpjService';

const LEADS_COLLECTION = 'leads';

export function ouvirLeadsTempoReal(
  onUpdate: (leads: Lead[]) => void,
  onError?: (err: Error) => void
): () => void {
  const ref = collection(db, LEADS_COLLECTION);
  return onSnapshot(
    ref,
    (snapshot) => {
      const leads: Lead[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Lead;
        leads.push(autocorrigeLead({ ...data, id: docSnap.id }));
      });
      leads.sort(
        (a, b) =>
          new Date(b.atualizadoEm || b.criadoEm || 0).getTime() -
          new Date(a.atualizadoEm || a.criadoEm || 0).getTime()
      );
      onUpdate(leads);
    },
    (err) => {
      console.error('[Firestore] Erro na subscription de leads:', err);
      onError?.(err);
    }
  );
}

export async function salvarLeadNoFirestore(lead: Lead): Promise<void> {
  const ref = doc(db, LEADS_COLLECTION, lead.id);
  await setDoc(ref, lead, { merge: true });
}

export async function deletarLeadNoFirestore(leadId: string): Promise<void> {
  const ref = doc(db, LEADS_COLLECTION, leadId);
  await deleteDoc(ref);
}

export async function salvarTodosLeadsNoFirestore(leads: Lead[]): Promise<void> {
  if (leads.length === 0) return;
  const BATCH_SIZE = 450;
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = leads.slice(i, i + BATCH_SIZE);
    for (const lead of chunk) {
      const ref = doc(db, LEADS_COLLECTION, lead.id);
      batch.set(ref, lead, { merge: true });
    }
    await batch.commit();
  }
}

export async function buscarTodosLeadsDoFirestore(): Promise<Lead[]> {
  const snapshot = await getDocs(collection(db, LEADS_COLLECTION));
  const leads: Lead[] = [];
  snapshot.forEach((docSnap) => {
    leads.push(autocorrigeLead({ ...docSnap.data() as Lead, id: docSnap.id }));
  });
  return leads;
}

export async function limparTodosLeadsDoFirestore(): Promise<void> {
  const snapshot = await getDocs(collection(db, LEADS_COLLECTION));
  if (snapshot.empty) return;
  const BATCH_SIZE = 450;
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + BATCH_SIZE);
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }
}

export function ouvirTemplatesTempoReal(
  onUpdate: (templates: MessageTemplate[]) => void
): () => void {
  const ref = doc(db, 'config', 'templates');
  return onSnapshot(ref, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (Array.isArray(data.lista) && data.lista.length > 0) {
        onUpdate(data.lista as MessageTemplate[]);
      }
    }
  });
}

export async function salvarTemplatesNoFirestore(templates: MessageTemplate[]): Promise<void> {
  const ref = doc(db, 'config', 'templates');
  await setDoc(ref, { lista: templates, atualizadoEm: new Date().toISOString() }, { merge: true });
}
