'use client'
import React from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose

} from '@/components/ui/drawer'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { X } from 'lucide-react'

// @ts-ignore
export default function PdfReader({pdfUrls}) {
  return (
    <Drawer>
      <DrawerTrigger>
        <Button className="absolute -top-12 left-2">Open PDF</Button>
      </DrawerTrigger>
      <DrawerContent className='bg-black h-[90%] p-2 rounded-lg max-w-5xl mx-auto'>
          <div className="flex justify-end items-center p-2">
            <DrawerClose>
              <Button variant={"outline"}>Close</Button>
            </DrawerClose>
          </div>
          <embed
            src={pdfUrls?.url}
            // @ts-ignore
            allowFullScreen={true}
            zoom
            title="arXiv Paper"
            width="100%"
            height="100%"
          ></embed>
      </DrawerContent>
    </Drawer>
  )
}
