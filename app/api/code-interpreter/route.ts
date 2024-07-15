import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const maxDuration = 295

export const fileIds = [
  // 'file-qnuRYc9XbS8F0p8DkpPzsE5e',
  // 'file-lHoUCkiic3JfrZ8PMzwsteq6',
  // 'file-IPcDPuapf5415JxYTH5wbFXC',
  // 'file-XvKZvKDoAMCNfhF5NpSGxqba',
  // 'file-kCR3tWdG1FIMqndU5Xjl1jzS',
  // 'file-CyaPowqmlf1G4mtKFfcDfk0V',
  'file-rtEtHND0tOt4PJ1t9PyiWhxP'
  // 'file-AhEbnNGLsWdZhxWXsdhggyZ1'
  // 'file-gA6GNqEiDAkbkrX8fstAUpf3',
  // 'file-lqTCUL4IUfGzS5kELKvrekCn',
  // 'file-S7W0wBggT9mjhU2ODdHYXwEJ'
]

export const Province: { [key: string]: string } = {
  Alberta: 'file-jzxeHICXtHlNu1wE3aeOcGVy',
  'British Columbia': 'file-DMtBNH4LlPR3DLipygblzMhL',
  Manitoba: 'file-MA42h4Eoi7raYMALCQD2xb04',
  'New Brunswick': 'file-QJJKX3Fg12lMyviinp2xbtaP',
  'Newfoundland and Labrador': 'file-PG18AA0SZzFgLwqcfIHcBNVB',
  'Nova Scotia': 'file-9EPTjsPw2oyPeF4hY2oDY84D',
  Ontario: 'file-rtEtHND0tOt4PJ1t9PyiWhxP',
  'Prince Edward Island': 'file-V5GYv1xENlaqcT58TuLv4XKx',
  Quebec: 'file-ChQ5HFKq0E4MFa4B04I4Txce',
  Saskatchewan: 'file-16XTQcj2fP5bvrmweOKgN57O',
  Canada: 'file-3xhirTrJ8iN0ZImbXUwN4HAO'
}

interface RequestBody {
  prompt?: string
  province?: string
}

export async function POST(request: Request) {
  try {
    const { prompt, province } = (await request.json()) as RequestBody
    const files = ['file-3xhirTrJ8iN0ZImbXUwN4HAO']

    if (!prompt) {
      return NextResponse.json(
        { error: 'Please provide your required prompt' },
        { status: 400 }
      )
    }

    if (province) {
      for (const key in Province) {
        console.log(key)
        if (key === province && Province[key]) {
          files.pop()
          files.push(Province[key])
          break
        }
      }
    }

    console.log('Files', files)

    const assistant = await openai.beta.assistants.create({
      instructions: `You are a helpful data assistant tool.
       You will analyze the provided HTML file and get the data for the user's question. Use Buietyfull soup library to get data.
       Perform any necessary calculations and answer the user's question. 
       You can provide answers such as total population, number of men or women, or plot graphs for population growth.
       The final response should contain the answer to the user's question or the requested graph.`,
      model: 'gpt-4o',
      tools: [{ type: 'code_interpreter' }],
      tool_resources: {
        code_interpreter: {
          file_ids: files
        }
      }
    })

    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: prompt,
          attachments: files.map(id => ({
            file_id: id,
            tools: [{ type: 'code_interpreter' }]
          }))
        }
      ]
    })

    let run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
      instructions: `Please analyze the provided HTML file to answer the user's question. You can use buitifulsoup library to get the answer. You may need to sum values, perform calculations, or generate plots based on the question. Provide a precise answer or the requested graph. Do not mention the file type in the response.`
    })

    let result = ''
    let imageId = ''

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(run.thread_id)
      for (const message of messages.data.reverse()) {
        // @ts-ignore
        console.log(`${message.role} > ${message.content[0]?.text?.value}`)
        if (message.role === 'assistant') {
          // @ts-ignore
          // result = message.content[0]?.text?.value
          for (const content of message.content) {
            // console.log("content", content)
            if (content.type === 'image_file') {
              imageId = content.image_file.file_id
            }
            if (content.type === 'text') {
              if (content.text.value) {
                result = content.text.value
              }
            }
          }
        }
      }
    } else {
      console.log(run.status)
      return NextResponse.json(
        { error: 'Open AI response error, Please try again.' },
        { status: 400 }
      )
    }

    if (result === '') {
      result = 'Please try again.'
    }

    return NextResponse.json({ message: result, imageId })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: 'Internal Server Error.' },
      { status: 500 }
    )
  }
}
