'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { AiMentor } from '@/types/aiMentor';
import { getMentorById } from '@/lib/firebase/services/aiMentors';
import { PixelStreamComponent, PixelStreamComponentHandles } from '@convai/experience-embed';

export default function MentorInteractionPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const [mentor, setMentor] = useState<AiMentor | null>(null);
  const [loading, setLoading] = useState(true);
  const pixelStreamRef = useRef<PixelStreamComponentHandles>(null);

  useEffect(() => {
    if (typeof id === 'string') {
      const fetchMentor = async () => {
        try {
          const mentorData = await getMentorById(id);
          setMentor(mentorData);
        } catch (error) {
          console.error('Erro ao buscar mentor:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchMentor();
    }
  }, [id]);

  const handleStartExperience = async () => {
    await pixelStreamRef.current?.initializeExperience();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="text-center">
        <p>Mentor não encontrado.</p>
        <Button onClick={() => router.push('/dashboard/mentors')} className="mt-4">
          Voltar para a Galeria
        </Button>
      </div>
    );
  }

  // A documentação do Convai usa 'expId'. Vamos assumir que o nosso
  // 'convaiCharacterId' é o identificador correto a ser usado aqui.
  const experienceId = mentor.convaiCharacterId;

  return (
    <div className="flex flex-col h-full gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/mentors')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Conversando com {mentor.name}
          </CardTitle>
        </CardHeader>
      </Card>
      <div className="flex-grow relative bg-black rounded-lg">
        <PixelStreamComponent
          ref={pixelStreamRef}
          expId={experienceId}
          InitialScreen={
            <div className="w-full h-full flex flex-col items-center justify-center text-white">
              <p className="mb-4">Pronto para conversar com {mentor.name}?</p>
              <Button onClick={handleStartExperience}>Iniciar Sessão</Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
