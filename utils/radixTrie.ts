// see pruned radix trie
class Node<P> {
  public children: { key: string; child: Node<P> }[] | null = null;
  public termFrequencyCount: number;
  public termFrequencyCountChildMax: number = 0;
  public payload: P | undefined;
  constructor(termfrequencyCount: number, payload: P | undefined) {
    this.termFrequencyCount = termfrequencyCount;
    this.payload = payload;
  }
}
type searchResult<P> = {
  term: string;
  termFrequencyCount: number;
  payload: P;
}[];

class Trie<P> {
  public termCount: number = 0;
  public termCountLoaded: number = 0;
  private readonly trie: Node<P>;
  constructor() {
    this.trie = new Node<P>(0, undefined);
  }
  static fromAliases(param: [string, string][]): Trie<string> {
    let t = new Trie<string>();
    param.forEach((x) => t.addTerm(x[1], x[0]));
    return t;
  }
  public addTerm(term: string, payload: P): void {
    const nodeList: Node<P>[] = [];
    this.innerAddTerm(this.trie, term, payload, term.length, 0, 0, nodeList);
  }
  private updateMaxCounts(
    nodeList: Node<P>[],
    termFrequencyCount: number
  ): void {
    nodeList.forEach((node) =>
      termFrequencyCount > node.termFrequencyCountChildMax
        ? (node.termFrequencyCountChildMax = termFrequencyCount)
        : null
    );
  }

  private innerAddTerm(
    curr: Node<P>,
    term: string,
    payload: P,
    termFrequencyCount: number,
    id: number,
    level: number,
    nodeList: Node<P>[]
  ): void {
    try {
      nodeList.push(curr);

      let common = 0;
      if (!!curr.children) {
        for (let j = 0; j < curr.children.length; j++) {
          let { key, child: node } = curr.children[j];

          for (let i = 0; i < Math.min(term.length, key.length); i++)
            if (term[i] == key[i]) common = i + 1;
            else break;

          if (common > 0) {
            if (common == term.length && common == key.length) {
              if (node.termFrequencyCount == 0) this.termCount++;
              node.termFrequencyCount += termFrequencyCount;
              node.payload = payload;
              this.updateMaxCounts(nodeList, node.termFrequencyCount);
            } else if (common == term.length) {
              let child = new Node<P>(termFrequencyCount, payload);
              child.children = [
                {
                  key: key.substring(common),
                  child: node,
                },
              ];
              child.termFrequencyCountChildMax = Math.max(
                node.termFrequencyCountChildMax,
                node.termFrequencyCount
              );
              this.updateMaxCounts(nodeList, termFrequencyCount);

              curr.children[j] = {
                key: term.substring(0, common),
                child,
              };
              curr.children.sort(
                (x, y) =>
                  y.child.termFrequencyCountChildMax -
                  x.child.termFrequencyCountChildMax
              );
              this.termCount++;
            } else if (common == key.length) {
              this.innerAddTerm(
                node,
                term.substring(common),
                payload,
                termFrequencyCount,
                id,
                level + 1,
                nodeList
              );
            } else {
              let child = new Node<P>(0, undefined);
              child.children = [
                {
                  key: key.substring(common),
                  child: node,
                },
                {
                  key: term.substring(common),
                  child: new Node<P>(termFrequencyCount, payload),
                },
              ];
              child.termFrequencyCountChildMax = Math.max(
                node.termFrequencyCountChildMax,
                Math.max(termFrequencyCount, node.termFrequencyCount)
              );
              this.updateMaxCounts(nodeList, termFrequencyCount);

              curr.children[j] = {
                key: term.substring(0, common),
                child,
              };
              curr.children.sort(
                (x, y) =>
                  y.child.termFrequencyCountChildMax -
                  x.child.termFrequencyCountChildMax
              );
              this.termCount++;
            }
            return;
          }
        }
      }

      if (curr.children == null) {
        curr.children = [
          {
            key: term,
            child: new Node<P>(termFrequencyCount, payload),
          },
        ];
      } else {
        curr.children.push({
          key: term,
          child: new Node(termFrequencyCount, payload),
        });
        curr.children.sort(
          (x, y) =>
            y.child.termFrequencyCountChildMax -
            x.child.termFrequencyCountChildMax
        );
      }
      this.termCount++;
      this.updateMaxCounts(nodeList, termFrequencyCount);
    } catch (e) {
      console.log("exception: " + term + " " + e);
    }
  }
  public findAllChildTerms(
    prefix: string,
    topK: number,
    termFrequencyCountPrefix: number,
    prefixString: string,
    results: searchResult<P>
  ): void {
    this.internalFindAllChildTerms(
      prefix,
      this.trie,
      topK,
      termFrequencyCountPrefix,
      prefixString,
      results
    );
  }

  public internalFindAllChildTerms(
    prefix: string,
    curr: Node<P>,
    topK: number,
    termfrequencyCountPrefix: number,
    prefixString: string,
    results: searchResult<P>
  ): void {
    try {
      if (
        topK > 0 &&
        results.length == topK &&
        curr.termFrequencyCountChildMax <= results[topK - 1].termFrequencyCount
      )
        return;

      let noPrefix = prefix.trim() === "";

      if (!!curr.children) {
        for (let { key, child: node } of curr.children) {
          if (
            topK > 0 &&
            results.length == topK &&
            node.termFrequencyCount <= results[topK - 1].termFrequencyCount &&
            node.termFrequencyCountChildMax <=
              results[topK - 1].termFrequencyCount
          ) {
            if (!noPrefix) break;
            else continue;
          }

          if (noPrefix || key.startsWith(prefix)) {
            if (node.termFrequencyCount > 0) {
              if (prefix == key)
                termfrequencyCountPrefix = node.termFrequencyCount;
              //candidate
              if (topK > 0) {
                this.addTopKSuggestion(
                  prefixString + key,
                  node.termFrequencyCount,
                  topK,
                  node.payload!,
                  results
                );
              } else {
                results.push({
                  term: prefixString + key,
                  termFrequencyCount: node.termFrequencyCount,
                  payload: node.payload!,
                });
              }
            }

            if (node.children != null && node.children.length > 0)
              this.internalFindAllChildTerms(
                "",
                node,
                topK,
                termfrequencyCountPrefix,
                prefixString + key,
                results
              );
            if (!noPrefix) break;
          } else if (prefix.startsWith(key)) {
            if (node.children != null && node.children.length > 0)
              this.internalFindAllChildTerms(
                prefix.substring(key.length),
                node,
                topK,
                termfrequencyCountPrefix,
                prefixString + key,
                results
              );
            break;
          }
        }
      }
    } catch (e) {
      console.log("exception: " + prefix + " " + e);
    }
  }

  public GetTopkTermsForPrefix(
    prefix: string,
    topK: number,
    termFrequencyCountPrefix: number
  ): searchResult<P> {
    let results: searchResult<P> = [];

    termFrequencyCountPrefix = 0;

    this.findAllChildTerms(prefix, topK, termFrequencyCountPrefix, "", results);

    return results;
  }
  public addTopKSuggestion(
    term: string,
    termFrequencyCount: number,
    topK: number,
    p: P,
    results: searchResult<P>
  ): void {
    if (
      results.length < topK ||
      termFrequencyCount >= results[topK - 1].termFrequencyCount
    ) {
      let index = binarySearch(
        results,
        { term, termFrequencyCount, payload: p },
        (
          { termFrequencyCount, term: __ },
          { termFrequencyCount: termFrequencyCount2, term: _ }
        ) => {
          if (termFrequencyCount2 === termFrequencyCount) {
            return 0;
          }
          if (termFrequencyCount2 < termFrequencyCount) {
            return 1;
          } else {
            return -1;
          }
        }
      );
      if (index < 0)
        results.splice(~index, 0, { term, termFrequencyCount, payload: p });
      else results.splice(index, 0, { term, termFrequencyCount, payload: p });

      if (results.length > topK) results.splice(topK, 1);
    }
  }
}
function binarySearch<A>(
  arr: A[],
  x: A,
  comp: (arg: A, arg2: A) => -1 | 0 | 1
): number {
  let start = 0,
    end = arr.length - 1;

  while (start <= end) {
    let mid = Math.floor((start + end) / 2);

    if (comp(x, arr[mid]) === 0) return mid;
    else if (comp(x, arr[mid]) === -1) {
      start = mid + 1;
    } else {
      end = mid - 1;
    }
  }

  return -1;
}
export { Node, Trie };
