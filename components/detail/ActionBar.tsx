'use client';

import { Shop } from '@/lib/types';
import { Button } from '@heroui/react';
import { Phone, MessageCircle } from 'lucide-react';
import { getMergedContact } from '@/lib/utils';

interface ActionBarProps {
  shop: Shop;
}

export function ActionBar({ shop }: ActionBarProps) {
  const contact = getMergedContact(shop);

  const hasPhone = Boolean(contact.phone);

  if (!hasPhone) return null;

  return (
    <div className="flex gap-2">
      <Button
        as="a"
        href={`tel:${contact.phone}`}
        variant="flat"
        size="sm"
        startContent={<Phone className="w-4 h-4" />}
        className="bg-surface flex-1"
      >
        Call
      </Button>
      <Button
        as="a"
        href={`sms:${contact.phone}`}
        variant="flat"
        size="sm"
        startContent={<MessageCircle className="w-4 h-4" />}
        className="bg-surface flex-1"
      >
        Message
      </Button>
    </div>
  );
}
