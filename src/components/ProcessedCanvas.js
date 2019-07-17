import React, { Component, Fragment } from 'react'
import { withRouter } from 'react-router-dom'
import { Zip } from '../utils'
import { saveAs } from 'file-saver'
import DataContext from '../context/DataContext'
import stitchProcessing from '../utils/stitchProcressing.js'

class ProcessedCanvas extends Component {
  static contextType = DataContext
  canvasRefs = []
  state = {
    processedCanvases: [],
    blobs: [],
    totalHeight: 0,
    avgHeight: 0,
    canvasProcessStatus: false
  }
  componentDidUpdate(prevProps, prevState) {
    const currStatus = this.state.canvasProcessStatus,
      prevStatus = prevState.canvasProcessStatus,
      processedCanvases = this.state.processedCanvases,
      canLen = processedCanvases.length,
      blobs = []

    if (currStatus === prevStatus) return

    for (let j = 0; j < canLen; j++) {
      const { sourceCan, i, width, height } = processedCanvases[j]
      if (i === j) {
        const canvas = this.canvasRefs[i]
        this.drawCanvas(canvas, {
          sourceCan,
          i,
          width,
          height
        })
        const blob = this.getCanvasBlob(canvas, 'image/jpeg', 1).then(
          blob => {
            // blobs.push(blob) //since it's asyc, push the promises so they stay in order
            return blob
          },
          err => {
            console.error(err)
          }
        )
        blobs.push(blob)
      }
    }
    this.setState({
      blobs
    })
  }

  componentDidMount() {
    const { canvasDivRef, avgHeight } = this.context,
      canvasList = Array.from(canvasDivRef.children),
      { processedCanvases } = stitchProcessing(
        canvasList,
        avgHeight,
        this.canvasRefs
      )
    this.setState({
      processedCanvases,
      canvasProcessStatus: true
    })
    this.context.setContextState({
      canvasProcessStatus: true
    })
    this.pushToHistoryState(this.props.history)
  }

  pushToHistoryState = history => {
    history.push('/download')
  }

  getCanvasBlob = (canvas, mimeType, quality) => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          resolve(blob)
        },
        mimeType,
        quality
      )
    })
  }
  drawCanvas = (canvas, { sourceCan, i, width, height }) => {
    const ctx = canvas.getContext('2d')
    ctx.drawImage(sourceCan, 0, 0, width, height, 0, 0, width, height)
  }

  handleDownloadClick = () => {
    Promise.all(this.state.blobs).then(blobs => {
      const files = []
      blobs.forEach((blob, i) => {
        const stream = function() {
          return new Response(blob).body
        }
        const file = {
          name: `${i}.jpeg`,
          stream
        }
        files.push(file)
      })
      const readableStream = new Zip({
        start(ctrl) {
          files.forEach(file => {
            ctrl.enqueue(file)
          })
          ctrl.close()
        }
      })
      new Response(readableStream).blob().then(blob => {
        saveAs(blob, 'archive.zip')
      })
    })
  }

  render() {
    return (
      <Fragment>
        <div>
          <button onClick={this.handleDownloadClick}>Download</button>
        </div>
        {this.state.processedCanvases.map((processedCan, i) => {
          return processedCan.canvas
        })}
      </Fragment>
    )
  }
}

export default withRouter(ProcessedCanvas)