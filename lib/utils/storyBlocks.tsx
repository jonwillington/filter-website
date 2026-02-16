import React from 'react';
import { StrapiBlock, StrapiBlockChild } from '@/lib/types';

/**
 * Extract plain text from a story field (handles both string and blocks array).
 */
export function getStoryText(story: string | StrapiBlock[] | null | undefined): string {
  if (!story) return '';
  if (typeof story === 'string') return story;
  return story
    .map((block) => getChildrenText(block.children))
    .filter(Boolean)
    .join('\n');
}

function getChildrenText(children?: StrapiBlockChild[]): string {
  if (!children) return '';
  return children
    .map((child) => {
      if (child.text !== undefined) return child.text;
      if (child.children) return getChildrenText(child.children);
      return '';
    })
    .join('');
}

/**
 * Render a story field (string or blocks array) as React elements.
 */
export function RenderStory({ story }: { story: string | StrapiBlock[] | null | undefined }) {
  if (!story) return null;

  if (typeof story === 'string') {
    return (
      <>
        {story.split('\n').filter(Boolean).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </>
    );
  }

  return (
    <>
      {story.map((block, i) => (
        <RenderBlock key={i} block={block} />
      ))}
    </>
  );
}

function RenderBlock({ block }: { block: StrapiBlock }) {
  const children = renderChildren(block.children);

  switch (block.type) {
    case 'paragraph':
      return <p>{children}</p>;
    case 'heading': {
      const Tag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
      return <Tag className="font-medium text-primary">{children}</Tag>;
    }
    case 'list': {
      const Tag = block.format === 'ordered' ? 'ol' : 'ul';
      const listClass = block.format === 'ordered' ? 'list-decimal pl-5' : 'list-disc pl-5';
      return <Tag className={listClass}>{children}</Tag>;
    }
    case 'list-item':
      return <li>{children}</li>;
    case 'quote':
      return <blockquote className="border-l-2 border-border-default pl-4 italic">{children}</blockquote>;
    case 'code':
      return <pre className="bg-surface rounded p-3 text-xs overflow-x-auto"><code>{children}</code></pre>;
    case 'image':
      if (block.image?.url) {
        return (
          <img
            src={block.image.url}
            alt={block.image.alternativeText || ''}
            className="rounded-lg max-w-full"
          />
        );
      }
      return null;
    default:
      return <p>{children}</p>;
  }
}

function renderChildren(children?: StrapiBlockChild[]): React.ReactNode {
  if (!children) return null;
  return children.map((child, i) => renderChild(child, i));
}

function renderChild(child: StrapiBlockChild, key: number): React.ReactNode {
  if (child.type === 'link') {
    return (
      <a key={key} href={child.url} className="text-accent underline" target="_blank" rel="noopener noreferrer">
        {renderChildren(child.children)}
      </a>
    );
  }

  let node: React.ReactNode = child.text || '';
  if (child.bold) node = <strong key={key}>{node}</strong>;
  if (child.italic) node = <em key={`${key}-i`}>{node}</em>;
  if (child.underline) node = <u key={`${key}-u`}>{node}</u>;
  if (child.strikethrough) node = <s key={`${key}-s`}>{node}</s>;
  if (child.code) node = <code key={`${key}-c`} className="bg-surface rounded px-1 text-xs">{node}</code>;

  return <React.Fragment key={key}>{node}</React.Fragment>;
}
